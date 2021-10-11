// https://stackoverflow.com/a/12397602
Handlebars.registerHelper("breaklines", (text) => {
  text = Handlebars.Utils.escapeExpression(text);
  text = text.replace(/(\r\n|\n|\r)/gm, "<br>");
  return new Handlebars.SafeString(text);
});

// https://stackoverflow.com/a/31632215
Handlebars.registerHelper({
  eq: (v1, v2) => v1 === v2,
  ne: (v1, v2) => v1 !== v2,
  lt: (v1, v2) => v1 < v2,
  gt: (v1, v2) => v1 > v2,
  lte: (v1, v2) => v1 <= v2,
  gte: (v1, v2) => v1 >= v2,
  and: () => Array.prototype.slice.call(arguments).every(Boolean),
  or: () => Array.prototype.slice.call(arguments, 0, -1).some(Boolean),
});
