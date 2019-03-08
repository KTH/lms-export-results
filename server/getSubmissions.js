const CanvasApi = require('kth-canvas-api')
const test = require('tape')
const canvasApi = new CanvasApi(process.env.CANVAS_HOST, process.env.CANVAS_TOKEN)

test('', async t =>{
   t.equal(1,3) 
})

