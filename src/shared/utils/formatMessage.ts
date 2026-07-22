export function formatMessage(message: string, data: any) {
  return message
    .split('\n')
    .filter(line => {
      const match = line.match(/{{\s*(\w+)\s*}}/);
      if (!match) return true;

      const key = match[1];
      return data[key] !== null && data[key] !== undefined;
    })
    .map(line =>
      line.replace(/{{\s*(\w+)\s*}}/g, (_, key) => data[key] ?? '')
    )
    .join('\n');
}
