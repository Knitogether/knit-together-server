class CustomError extends Error {
    constructor(errorCode, errorMessage) {
      super(errorMessage);  // 부모 클래스인 Error의 생성자 호출
      this.code = errorCode;  // 에러 코드
    //   this.message = errorMessage; // 에러 메시지
      //Error.captureStackTrace(this, this.constructor);  // 스택 트레이스를 캡처
    }
  }
  
module.exports = CustomError;