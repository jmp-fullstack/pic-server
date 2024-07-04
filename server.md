## 서버 구성하기

1. 바탕화면에 새폴더로 프로젝트 폴더 만들기

2. node.js 설치

   - nodejs.org 홈피에 접속
   - 설치파일 node-v20.15.0-x64.msi 를 새폴더에 다운로드
   - node-v20.15.0-x64.msi 실행하여 program Files > nodejs 에 설치, 모두 next 하고 install 버튼 클릭

3. vs code 에서 서버 시작하기

   - 프로젝트 폴더에서 git bash하고 node . 로 vscode시작
   - 루트에 index.js 만들기
   - console.log("hello world"); 코딩하고 저장 ctl + s
   - 서버터미널 시작하기 ctl + shift + `
   - node 설치 확인
     - index.js 실행 : >node index.js 실행
     - hello world가 보이면 node 설치 잘된거임
     - tip : 오류메세지를 복사해서 구글에 올리면 대부분 나옴

4. npm 에서 필요, 편리한 툴 가져다 쓰기 (npm홈피에서 모듈, 사용법등 참조)

   - npm으로 설치한 모듈 기록 만들기

     - 터미널에서 npm init 실행하고 조회되는 옵션 엔터로 지나가기 (패키지는 뭐고, entry point는 index.js이고.. 등등 )
     - npm init 실행하면 package.json이 root 에 생성되고
     - npm으로 설치되는 모든 모듈이 파일에 기록된다
     - 향후 이 프로젝트를 외부 서버에 Deploy 할때 필요모듈 설치의 기준이 됨

   - 모듈 설치 방법 : npm install [라이브러리 이름] (-g 를 붙이면 내컴퓨터 모든 디렉토리에 적용)

     - npm 연습 : npm install figlet : 큰 글자 만들기
     - package.json 의 dependencies 에 모듈 설치했다는 기록 생김, package-lock.json 에는 더욱 자세한 정보 기록
     - root에 node_modules 디렉토리가 생성되고 설치된 모듈 디렉토리가 보이고 그 안에 엄청 많은 프로그램 보임.

   - 모듈 삭제 방법 : npm uninstall [라이브러리 이름]

5. express 포함 모듈 설치

   - express : Node.js를 위한 빠르고 개방적인 간결한 웹 프레임워크
   - bcrypt : salting과 키 스트레칭을 구현한 해시 함수 중 대표적인 함수
   - body-parser : Express 애플리케이션에서 요청의 본문을 해석하고 파싱하는 미들웨어. 클라이언트로부터 전송된 JSON, URL-encoded 및 기타 형식의 데이터를 해석하여 JavaScript 객체로 변환
   - cors : SOP는 2011년 RFC 6454에서 등장한 보안 정책으로 "같은 출처에서만 리소스를 공유할 수 있다"라는 규칙을 가진 정책을 해결하는 것
   - dotenv : .env라는 외부 파일에 중요한 정보를 환경변수로 저장하여 정보를 관리. .gitignore에서 .env 제외
   - express-session : Create a session middleware with the given options.세션 데이터를 서버에 저장하고 클라이언트에 고유한 세션 식별자를 부여하여 상태를 유지
   - multer : 파일 업로드를 위해 사용되는 multipart/form-data 를 다루기 위한 node.js 의 미들웨어
   - mysql : SQL이라고 하는 구조화된 쿼리 언어를 사용하여 데이터를 정의, 조작, 제어, 쿼리하는 관계형 데이터베이스
   - path : 프로그램을 찾는 기본 경로를 담당
   - session-file-store : 세션이 데이터를 저장하는 곳. 대표적으로 Memory Store, File Store, Mongo Store.

6. index.js에 API서버 로직 구현

7. index.js 기동
   - terminal 에서 node index.js 로 기동
   - ctl + C 로 해제,
   - API서버 수정시마다 기동/해제 해줘야 로직 반영됨
   - 기동/해제 자동화 : Nodemon 모듈 설치
