const test = require('tape')
const rewire = require('rewire')
const sinon = require('sinon')
require('rewire-global').enable()
const proxyquire = require('proxyquire')

class CanvasApi {
  requestUrl (url) {
    console.log('>>>>>>>> Mocking requestUrl <<<<<<<<', url)
    return []
  }
  recursePages () {
    console.log('>>>>>>>> Mocking recursePages <<<<<<<<')
    return []
  }
}

const _export = proxyquire('../../server/export', {
  'kth-canvas-api': CanvasApi,
  './ldap': {
    getBoundClient () {
    console.log('mocking ldap client')
    return {
      unbind(){}
    }
  }}
})
const exportResults = _export.__get__('exportResults')
const exportResults3 = _export.__get__('exportResults3')

test('should redirect to the Canvas authentication page', t => {
  const res = {redirect: sinon.spy()}
  const req = {body: {}, get: () => ''}

  exportResults(req, res)

  t.equal(res.redirect.callCount, 1)
  t.end()
})

test('should send status:500 if exportResults breaks', t => {
  const res = {status: sinon.stub().returns({
    send () {}
  })}
  const req = {body: {}, get: () => {
    throw new Error('Just pretending that something breaks...')
  }}

  exportResults(req, res)

  t.equal(res.status.getCalls()[0].args[0], 500)

  t.end()
})

test(`should write a file
    with BOM and headlines
    if there's no assignments in the course`, async t => {
  const res = {
    set: sinon.spy(),
    attachment: sinon.spy(),
    write: sinon.spy(),
    send () {}
  }
  const req = {query: {courseRound: 'round', canvasCourseId: 'canvasCourseId'}, get: () => ''}

  _export.__set__('getAccessToken', () => 'mocked token')
  _export.__set__('curriedIsFake', () => () => {
    return false
  })
  await exportResults3(req, res)
  sinon.assert.calledWith(res.write, '\uFEFF')
  sinon.assert.calledWith(res.write, sinon.match('SIS User ID;ID;Section;Name;Surname;Personnummer'))
  t.end()
})

test.skip(`should write a file
    with personnummer and name for the student
    if there's one assignment with one submission in the course`, async t => {
})
