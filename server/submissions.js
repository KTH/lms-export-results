const CanvasApi = require('kth-canvas-api')

// TODO: delete these test imports
const assert = require('assert')
const test = require('tape')


require('dotenv').config()

const canvasApi = new CanvasApi(process.env.CANVAS_HOST, process.env.CANVAS_TOKEN)


// TODO: This function should be deleted before we merge the PR. I think this test has done its good once the code is merged.
test('should construct the similar json', async t =>{
    // Get the json, sorted, without the test user. The new function don't incluce the test users.
    const oldWay= (await canvasApi.get(`courses/3719/students/submissions?grouped=1&student_ids[]=all&per_page=100`)).sort((a,b)=> a.user_id - b.user_id).filter(stud => stud.user_id !== 55842)
    
    // Make sure both arrays are sorted, so I can compare them
    const {newWay:students} = (await getStudentsAndSections(3719)).sort((a,b)=> a.user_id - b.user_id)

    // Ignore seconds late when comparing, since these are changed for every api call
    oldWay.forEach(student => student.submissions.forEach(sub => delete sub.seconds_late))
    newWay.forEach(student => student.submissions.forEach(sub => delete sub.seconds_late))

    assert.deepEqual(oldWay,newWay) 

    t.end()
})

async function getStudentsAndSections(courseId) {

    const sections = await canvasApi.get(`courses/${courseId}/sections?include[]=students`)

    const studentsPerSection = sections.map(section => section.students.map(student => ({
        user_id:student.id, 
        section_id:section.id,
        submissions: [], // Add this to preserve the order of the properties, to make deepEqual possible
        sis_user_id: student.sis_user_id,
        integration_id: student.integration_id
    })))
    
    // Flatten the students array
    const students = [].concat(...studentsPerSection)
    const submissions = await canvasApi.get(`courses/${courseId}/students/submissions?student_ids[]=all&per_page=100`)
    const studentsWithSubmissions= students.map( student => ({...student, submissions:submissions.filter(sub => sub.user_id === student.user_id)}) )
    
    return {sections,students: studentsWithSubmissions} 
}
module.exports = getStudentsAndSections
