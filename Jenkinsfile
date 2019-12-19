String cron_string = BRANCH_NAME == "master" ? "@midnight" : ""

pipeline {
    agent any

    triggers {
        cron(cron_string)
    }

    stages {
        stage('Cleanup') {
            steps {
                sh 'docker network prune -f'
            }
        }
        // These are the commands run in the original Jenkins project
        stage('Run Evolene') {
            environment {
                COMPOSE_PROJECT_NAME = "${env.BUILD_TAG}"

            }
            steps {
                sh 'ls $JENKINS_HOME/workspace/zermatt/jenkins/'
                sh '$JENKINS_HOME/workspace/zermatt/jenkins/buildinfo-to-node-module.sh /config/version.js'
                sh 'SLACK_CHANNELS="#team-e-larande-build,#pipeline-logs" DEBUG=True $EVOLENE_DIRECTORY/run.sh'
            }
        }
    }
}
