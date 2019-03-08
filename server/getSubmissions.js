const CanvasApi = require('kth-canvas-api')
const assert = require('assert')
require('dotenv').config()

const test = require('tape')
const canvasApi = new CanvasApi(process.env.CANVAS_HOST, process.env.CANVAS_TOKEN)
test('should construct the similar json', async t =>{
    const groupedJson = await canvasApi.get(`courses/3719/students/submissions?grouped=1&student_ids[]=all&per_page=100`)
    const builtJson = await getSubmissions()
    assert.deepEqual(groupedJson,builtJson) 
    t.end()
})

async function getSubmissions() {
   return {} 
}
