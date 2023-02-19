import random from 'lodash.random';
import colors from 'nice-color-palettes';

export const getRandomColors = () => {
  return colors[random(0, colors.length)];
};
