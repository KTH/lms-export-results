

module.exports = async function createResultsFile (courseId, courseRound, options) {
  const log = options.log

  let accessToken

  try {
    const auth = await rp({
      method: 'POST',
      uri: `https://${process.env.CANVAS_HOST}/login/oauth2/token`,
      body: {
        grant_type: 'authorization_code',
        client_id: process.env.CANVAS_CLIENT_ID,
        client_secret: process.env.CANVAS_CLIENT_SECRET,
        redirect_uri: options.oauth.redirectUri,
        code: options.oauth.code
      },
      json: true
    })

    accessToken = auth.access_token
  } catch (e) {
    log.warn('The access token cannot be retrieved from Canvas', e)
    throw e
  }

  const canvasApi = new CanvasApi(`https://${process.env.CANVAS_HOST}/api/v1`, accessToken)

  return {
    getHeaders () {

    },
    readLine () {
    }
  }
}
