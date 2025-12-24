// eslint-disable-next-line n/file-extension-in-import
import { optimize } from 'svgo/browser';

const createDimensionsExtractor = () => {
  const dimensions = {};
  const plugin = {
    type: 'visitor',
    name: 'extract-dimensions',
    fn() {
      return {
        element: {
          // Node, parentNode
          enter({ name, attributes }, { type }) {
            if (name === 'svg' && type === 'root') {
              if (
                attributes.width !== undefined &&
                attributes.height !== undefined
              ) {
                dimensions.width = Number.parseFloat(attributes.width);
                dimensions.height = Number.parseFloat(attributes.height);
              } else if (attributes.viewBox !== undefined) {
                const viewBox = attributes.viewBox.split(/,\s*|\s+/);
                dimensions.width = Number.parseFloat(viewBox[2]);
                dimensions.height = Number.parseFloat(viewBox[3]);
              }
            }
          },
        },
      };
    },
  };

  return [dimensions, plugin];
};

/**
 * Parse path d attribute and extract all coordinate points.
 * This handles M, L, H, V, C, S, Q, T, A commands (both absolute and relative).
 */
const parsePathBounds = (d) => {
  if (!d) return null;

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  let currentX = 0;
  let currentY = 0;
  let startX = 0;
  let startY = 0;

  const updateBounds = (x, y) => {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  };

  // Match commands and their parameters
  const commands = d.match(/[MmLlHhVvCcSsQqTtAaZz][^MmLlHhVvCcSsQqTtAaZz]*/g);
  if (!commands) return null;

  for (const cmd of commands) {
    const type = cmd[0];
    // Improved regex to handle SVG path number formats:
    // - Negative numbers: -123
    // - Decimals: .5, 0.5, 123.456
    // - Scientific notation: 1e-5, 1E+10
    // - Numbers that run together: 1.2.3 should be [1.2, .3]
    const args = cmd
      .slice(1)
      .trim()
      .match(/-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/gi);
    const nums = args ? args.map(Number) : [];

    const isRelative = type === type.toLowerCase();

    switch (type.toUpperCase()) {
      case 'M': // moveto
      case 'L': // lineto
        for (let i = 0; i < nums.length; i += 2) {
          if (isRelative) {
            currentX += nums[i];
            currentY += nums[i + 1];
          } else {
            currentX = nums[i];
            currentY = nums[i + 1];
          }

          updateBounds(currentX, currentY);

          if (type.toUpperCase() === 'M' && i === 0) {
            startX = currentX;
            startY = currentY;
          }
        }

        break;

      case 'H': // horizontal lineto
        for (const num of nums) {
          currentX = isRelative ? currentX + num : num;
          updateBounds(currentX, currentY);
        }

        break;

      case 'V': // vertical lineto
        for (const num of nums) {
          currentY = isRelative ? currentY + num : num;
          updateBounds(currentX, currentY);
        }

        break;

      case 'C': // curveto (cubic bezier)
        for (let i = 0; i < nums.length; i += 6) {
          const points = isRelative
            ? [
                currentX + nums[i],
                currentY + nums[i + 1],
                currentX + nums[i + 2],
                currentY + nums[i + 3],
                currentX + nums[i + 4],
                currentY + nums[i + 5],
              ]
            : [
                nums[i],
                nums[i + 1],
                nums[i + 2],
                nums[i + 3],
                nums[i + 4],
                nums[i + 5],
              ];

          // Include control points in bounds (conservative estimate)
          updateBounds(points[0], points[1]);
          updateBounds(points[2], points[3]);
          updateBounds(points[4], points[5]);

          currentX = points[4];
          currentY = points[5];
        }

        break;

      case 'S': // smooth curveto
        for (let i = 0; i < nums.length; i += 4) {
          const points = isRelative
            ? [
                currentX + nums[i],
                currentY + nums[i + 1],
                currentX + nums[i + 2],
                currentY + nums[i + 3],
              ]
            : [nums[i], nums[i + 1], nums[i + 2], nums[i + 3]];

          updateBounds(points[0], points[1]);
          updateBounds(points[2], points[3]);

          currentX = points[2];
          currentY = points[3];
        }

        break;

      case 'Q': // quadratic bezier
        for (let i = 0; i < nums.length; i += 4) {
          const points = isRelative
            ? [
                currentX + nums[i],
                currentY + nums[i + 1],
                currentX + nums[i + 2],
                currentY + nums[i + 3],
              ]
            : [nums[i], nums[i + 1], nums[i + 2], nums[i + 3]];

          updateBounds(points[0], points[1]);
          updateBounds(points[2], points[3]);

          currentX = points[2];
          currentY = points[3];
        }

        break;

      case 'T': // smooth quadratic bezier
        for (let i = 0; i < nums.length; i += 2) {
          if (isRelative) {
            currentX += nums[i];
            currentY += nums[i + 1];
          } else {
            currentX = nums[i];
            currentY = nums[i + 1];
          }

          updateBounds(currentX, currentY);
        }

        break;

      case 'A': // arc
        for (let i = 0; i < nums.length; i += 7) {
          const endX = isRelative ? currentX + nums[i + 5] : nums[i + 5];
          const endY = isRelative ? currentY + nums[i + 6] : nums[i + 6];
          const rx = nums[i];
          const ry = nums[i + 1];

          // Conservative estimate: use ellipse bounding box around endpoints
          updateBounds(currentX - rx, currentY - ry);
          updateBounds(currentX + rx, currentY + ry);
          updateBounds(endX - rx, endY - ry);
          updateBounds(endX + rx, endY + ry);
          updateBounds(endX, endY);

          currentX = endX;
          currentY = endY;
        }

        break;

      case 'Z': // closepath
        currentX = startX;
        currentY = startY;
        break;

      default:
        break;
    }
  }

  if (minX === Number.POSITIVE_INFINITY) return null;

  return { minX, minY, maxX, maxY };
};

/**
 * Calculates bounding box for a shape element based on its attributes.
 */
const calculateShapeBounds = (name, attrs) => {
  switch (name) {
    case 'rect': {
      const x = Number.parseFloat(attrs.x || 0);
      const y = Number.parseFloat(attrs.y || 0);
      const width = Number.parseFloat(attrs.width || 0);
      const height = Number.parseFloat(attrs.height || 0);
      return { minX: x, minY: y, maxX: x + width, maxY: y + height };
    }

    case 'circle': {
      const cx = Number.parseFloat(attrs.cx || 0);
      const cy = Number.parseFloat(attrs.cy || 0);
      const r = Number.parseFloat(attrs.r || 0);
      return { minX: cx - r, minY: cy - r, maxX: cx + r, maxY: cy + r };
    }

    case 'ellipse': {
      const cx = Number.parseFloat(attrs.cx || 0);
      const cy = Number.parseFloat(attrs.cy || 0);
      const rx = Number.parseFloat(attrs.rx || 0);
      const ry = Number.parseFloat(attrs.ry || 0);
      return { minX: cx - rx, minY: cy - ry, maxX: cx + rx, maxY: cy + ry };
    }

    case 'line': {
      const x1 = Number.parseFloat(attrs.x1 || 0);
      const y1 = Number.parseFloat(attrs.y1 || 0);
      const x2 = Number.parseFloat(attrs.x2 || 0);
      const y2 = Number.parseFloat(attrs.y2 || 0);
      return {
        minX: Math.min(x1, x2),
        minY: Math.min(y1, y2),
        maxX: Math.max(x1, x2),
        maxY: Math.max(y1, y2),
      };
    }

    case 'polyline':
    case 'polygon': {
      if (!attrs.points) return null;
      const points = attrs.points
        .trim()
        .split(/[\s,]+/)
        .map(Number);
      let minX = Number.POSITIVE_INFINITY;
      let minY = Number.POSITIVE_INFINITY;
      let maxX = Number.NEGATIVE_INFINITY;
      let maxY = Number.NEGATIVE_INFINITY;

      for (let i = 0; i < points.length; i += 2) {
        if (!Number.isNaN(points[i]) && !Number.isNaN(points[i + 1])) {
          minX = Math.min(minX, points[i]);
          maxX = Math.max(maxX, points[i]);
          minY = Math.min(minY, points[i + 1]);
          maxY = Math.max(maxY, points[i + 1]);
        }
      }

      return minX === Number.POSITIVE_INFINITY
        ? null
        : { minX, minY, maxX, maxY };
    }

    case 'path':
      return parsePathBounds(attrs.d);

    case 'text':
    case 'image':
    case 'use': {
      const x = Number.parseFloat(attrs.x || 0);
      const y = Number.parseFloat(attrs.y || 0);
      const width = Number.parseFloat(attrs.width || 100);
      const height = Number.parseFloat(attrs.height || 100);
      return { minX: x, minY: y, maxX: x + width, maxY: y + height };
    }

    default:
      return null;
  }
};

/**
 * Creates a plugin that trims whitespace around SVG content by adjusting the viewBox
 * to the bounding box of all visible elements.
 */
const createTrimWhitespacePlugin = () => {
  return {
    type: 'visitor',
    name: 'trim-whitespace',
    fn() {
      let minX = Number.POSITIVE_INFINITY;
      let minY = Number.POSITIVE_INFINITY;
      let maxX = Number.NEGATIVE_INFINITY;
      let maxY = Number.NEGATIVE_INFINITY;
      let hasVisibleContent = false;

      const shapeElements = new Set([
        'rect',
        'circle',
        'ellipse',
        'line',
        'polyline',
        'polygon',
        'path',
        'text',
        'image',
        'use',
      ]);

      return {
        element: {
          enter(node) {
            if (shapeElements.has(node.name)) {
              const bounds = calculateShapeBounds(node.name, node.attributes);

              if (bounds) {
                hasVisibleContent = true;
                minX = Math.min(minX, bounds.minX);
                minY = Math.min(minY, bounds.minY);
                maxX = Math.max(maxX, bounds.maxX);
                maxY = Math.max(maxY, bounds.maxY);
              }
            }
          },
          exit(node, parentNode) {
            if (
              node.name === 'svg' &&
              parentNode.type === 'root' &&
              hasVisibleContent &&
              minX !== Number.POSITIVE_INFINITY
            ) {
              const contentWidth = maxX - minX;
              const contentHeight = maxY - minY;

              if (contentWidth > 0 && contentHeight > 0) {
                // Set new viewBox to content bounds
                node.attributes.viewBox = `${minX} ${minY} ${contentWidth} ${contentHeight}`;

                // Remove explicit width/height to let viewBox control sizing
                // This allows the SVG to scale properly while maintaining aspect ratio
                delete node.attributes.width;
                delete node.attributes.height;
              }
            }
          },
        },
      };
    },
  };
};

/**
 * Creates a plugin that resizes the SVG based on max width/height or scale percentage.
 * Maintains aspect ratio.
 */
const createResizePlugin = (options) => {
  const { maxWidth = 0, maxHeight = 0, scalePercent = 100 } = options;

  return {
    type: 'visitor',
    name: 'resize-svg',
    fn() {
      return {
        element: {
          enter(node, parentNode) {
            if (node.name === 'svg' && parentNode.type === 'root') {
              let currentWidth;
              let currentHeight;
              let viewBoxWidth;
              let viewBoxHeight;

              // Get current dimensions
              if (
                node.attributes.width !== undefined &&
                node.attributes.height !== undefined
              ) {
                currentWidth = Number.parseFloat(node.attributes.width);
                currentHeight = Number.parseFloat(node.attributes.height);
              }

              if (node.attributes.viewBox !== undefined) {
                const viewBox = node.attributes.viewBox.split(/,\s*|\s+/);
                viewBoxWidth = Number.parseFloat(viewBox[2]);
                viewBoxHeight = Number.parseFloat(viewBox[3]);

                if (currentWidth === undefined) currentWidth = viewBoxWidth;
                if (currentHeight === undefined) currentHeight = viewBoxHeight;
              }

              if (!currentWidth || !currentHeight) return;

              let newWidth = currentWidth;
              let newHeight = currentHeight;
              const aspectRatio = currentWidth / currentHeight;

              // Apply scale percentage first
              if (scalePercent !== 100) {
                newWidth = (currentWidth * scalePercent) / 100;
                newHeight = (currentHeight * scalePercent) / 100;
              }

              // Then apply max constraints (maintaining aspect ratio)
              if (maxWidth > 0 && newWidth > maxWidth) {
                newWidth = maxWidth;
                newHeight = newWidth / aspectRatio;
              }

              if (maxHeight > 0 && newHeight > maxHeight) {
                newHeight = maxHeight;
                newWidth = newHeight * aspectRatio;
              }

              // Update attributes
              node.attributes.width = String(Math.round(newWidth * 100) / 100);
              node.attributes.height = String(
                Math.round(newHeight * 100) / 100,
              );

              // Ensure viewBox exists for proper scaling
              if (!node.attributes.viewBox) {
                node.attributes.viewBox = `0 0 ${currentWidth} ${currentHeight}`;
              }
            }
          },
        },
      };
    },
  };
};

function compress(svgInput, settings) {
  // setup plugin list
  const floatPrecision = Number(settings.floatPrecision);
  const transformPrecision = Number(settings.transformPrecision);
  const plugins = [];

  for (const [name, enabled] of Object.entries(settings.plugins)) {
    if (!enabled) continue;

    const plugin = {
      name,
      params: {},
    };

    // TODO: revisit this
    // 0 almost always breaks images when used on `cleanupNumericValues`.
    // Better to allow 0 for everything else, but switch to 1 for this plugin.
    plugin.params.floatPrecision =
      plugin.name === 'cleanupNumericValues' && floatPrecision === 0
        ? 1
        : floatPrecision;

    plugin.params.transformPrecision = transformPrecision;

    plugins.push(plugin);
  }

  // Add transform plugins based on settings
  const transform = settings.transform || {};

  // Collect transform plugins to run after SVGO plugins
  const transformPlugins = [];

  // Add whitespace trimming plugin if enabled
  if (transform.trimWhitespace) {
    transformPlugins.push(createTrimWhitespacePlugin());
  }

  // Add resize plugin if enabled and has meaningful values
  if (transform.enableResize) {
    const resizeOptions = {
      maxWidth: transform.maxWidth || 0,
      maxHeight: transform.maxHeight || 0,
      scalePercent: transform.scalePercent || 100,
    };

    // Only add resize plugin if there's something to do
    if (
      resizeOptions.maxWidth > 0 ||
      resizeOptions.maxHeight > 0 ||
      resizeOptions.scalePercent !== 100
    ) {
      transformPlugins.push(createResizePlugin(resizeOptions));
    }
  }

  // multipass optimization
  const [dimensions, extractDimensionsPlugin] = createDimensionsExtractor();

  // First pass: run SVGO plugins
  let { data, error } = optimize(svgInput, {
    multipass: settings.multipass,
    plugins,
    js2svg: {
      indent: 2,
      pretty: settings.pretty,
    },
  });

  if (error) throw new Error(error);

  // Second pass: run transform plugins (trim whitespace, resize) after SVGO
  if (transformPlugins.length > 0) {
    const result = optimize(data, {
      multipass: false,
      plugins: [...transformPlugins, extractDimensionsPlugin],
      js2svg: {
        indent: 2,
        pretty: settings.pretty,
      },
    });
    data = result.data;
    if (result.error) throw new Error(result.error);
  } else {
    // Just extract dimensions if no transform plugins
    const result = optimize(data, {
      multipass: false,
      plugins: [extractDimensionsPlugin],
      js2svg: {
        indent: 2,
        pretty: settings.pretty,
      },
    });
    data = result.data;
  }

  if (error) throw new Error(error);

  return { data, dimensions };
}

const actions = {
  wrapOriginal({ data }) {
    const [dimensions, extractDimensionsPlugin] = createDimensionsExtractor();
    const { error } = optimize(data, {
      plugins: [extractDimensionsPlugin],
    });

    if (error) throw new Error(error);

    return dimensions;
  },
  process({ data, settings }) {
    return compress(data, settings);
  },
};

self.onmessage = (event) => {
  try {
    self.postMessage({
      id: event.data.id,
      result: actions[event.data.action](event.data),
    });
  } catch (error) {
    self.postMessage({
      id: event.data.id,
      error: error.message,
    });
  }
};
