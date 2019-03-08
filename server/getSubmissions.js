const CanvasApi = require('kth-canvas-api')
const assert = require('assert')
require('dotenv').config()

const test = require('tape')
const canvasApi = new CanvasApi(process.env.CANVAS_HOST, process.env.CANVAS_TOKEN)
test('should construct the similar json', async t =>{
    const groupedJson = await canvasApi.get(`courses/3719/students/submissions?grouped=1&student_ids[]=all&per_page=100`)
    const builtJson = await getSubmissions()
    assert.deepEqual(groupedJson,builtJson, JSON.stringify(builtJson[0],null,2)) 
    t.end()
})

async function getSubmissions() {
    const sections = await canvasApi.get('courses/3719/sections?include[]=students')
    const studentSections = sections.map(section => section.students.map(student => ({
        user_id:student.id, 
        section_id:section.id,
        sis_user_id: student.sis_user_id,
        integration_id: student.integration_id
    })))

    const submissions = await canvasApi.get('courses/3719/students/submissions?student_ids[]=all&per_page=100')
    const result = studentSections.map(section => section.map(student => ({...student, submissions:submissions.filter(sub => sub.user_id === student.user_id)})))
    //debugger
    //students.forEach(student => student.submissions = submissions.filter(sub => sub.user_id === student.user_id))

   return result 



}
