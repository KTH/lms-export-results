function escapeCsvData (str) {
  str = '' + str

  if (str.includes(';') || str.includes(',')) {
    str = `"${str}"`
  }

  return str
}

module.exports = {
  createLine (strArr) {
    return strArr.map(escapeCsvData).join(';') + '\n'
  }
}
