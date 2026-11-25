export const logger = {
  info: (...args) => process.stdout.write(`${args.join(" ")}\n`),
};
