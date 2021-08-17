function escapeCsvData(str) {
  let result = "" + str;

  if (result.includes(";") || result.includes(",")) {
    result = `"${result}"`;
  }

  return result;
}

module.exports = {
  createLine(strArr) {
    return strArr.map(escapeCsvData).join(";") + "\n";
  },
};
