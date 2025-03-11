module.exports = {
    apps: [
        {
            name: 'server',
            script: './src/server.js',
            exec_mode: 'cluster', // fork, cluster 모드 중 선택
            instances: 2, // 클러스터 모드 사용 시 생성할 인스턴스 수, 0은 최대
            merge_logs: true, // 클러스터 모드 사용 시 각 클러스터에서 생성되는 로그를 한 파일로 합쳐준다.
            autorestart: true, // 프로세스 실패 시 자동으로 재시작할지 선택
            watch: false // 파일이 변경되었을 때 재시작 할지 선택
        },
    ]
}