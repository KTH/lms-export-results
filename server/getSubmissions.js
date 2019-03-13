const CanvasApi = require('kth-canvas-api')
const jsonDiff = require('json-diff')
const assert = require('assert')
require('dotenv').config()

const test = require('tape')
const canvasApi = new CanvasApi(process.env.CANVAS_HOST, process.env.CANVAS_TOKEN)
test('should construct the similar json', async t =>{
    const groupedJson = (await canvasApi.get(`courses/3719/students/submissions?grouped=1&student_ids[]=all&per_page=100`)).sort((a,b)=> a.user_id - b.user_id).filter(stud => stud.user_id !== 55842)
    //console.log('===============================') 
    //console.log(JSON.stringify(groupedJson))
    //console.log('-----------------------------')
    const groupedStudent = groupedJson.find(gj => gj.user_id === 51429)
    
    // ignore the test student
    const builtJson = (await getSubmissions()).sort((a,b)=> a.user_id - b.user_id)

    const builtStudent= builtJson.find(gj => gj.user_id === 51429)


    console.log('###############################') 
    console.log(JSON.stringify(groupedJson.find(stud => stud.user_id === 774)))
    console.log('-------------------------------')
    console.log(JSON.stringify(builtJson.find(stud => stud.user_id === 774)))

    // Ignore seconds late when comparing
    builtStudent.submissions.forEach(sub => delete sub.seconds_late)
    groupedStudent.submissions.forEach(sub => delete sub.seconds_late)

    groupedJson.forEach(student => student.submissions.forEach(sub => delete sub.seconds_late))
    builtJson.forEach(student => student.submissions.forEach(sub => delete sub.seconds_late))

//console.log(jsonDiff.diffString({ foo: 'bar' }, { foo: 'baz' }));
     //console.log(jsonDiff.diffString(builtJson.map(s => s.user_id), groupedJson.map(s => s.user_id)))
    console.log(groupedJson.map(s => s.user_id))

    assert.deepEqual(builtJson.length, groupedJson.length)
    assert.deepEqual(groupedJson,builtJson) 

    t.end()
})

async function getSubmissions() {

    const sections = await canvasApi.get('courses/3719/sections?include[]=students')

    // TODO: should flatten the array, so students is only a flat map. Reduce?

    const studentsPerSection = sections.map(section => section.students.map(student => ({
        user_id:student.id, 
        section_id:section.id,
        submissions: [], // Add this to preserve the order of the properties, to make deepEqual possible
        sis_user_id: student.sis_user_id,
        integration_id: student.integration_id
    })))
    const students = [].concat(...studentsPerSection)
    const submissions = await canvasApi.get('courses/3719/students/submissions?student_ids[]=all&per_page=100')
    const result = students.map( student => ({...student, submissions:submissions.filter(sub => sub.user_id === student.user_id)}) )
    
    //
    const groupedJson = await canvasApi.get(`courses/3719/students/submissions?grouped=1&student_ids[]=all&per_page=100`)

    console.log(students.length,result.length, groupedJson.length)
    return result 



}
