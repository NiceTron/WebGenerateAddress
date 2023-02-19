
function consoleOpenCallback() {
    alert("CONSOLE OPEN");
    console.log('CONSOLE.OPEN');
    return "";
}

/**
* 立即运行函数，用来检测控制台是否打开
*/
!function () {
    // 创建一个对象
    let foo = /./;
    // 将其打印到控制台上，实际上是一个指针
    console.log(foo);
    // 要在第一次打印完之后再重写toString方法
    foo.toString = consoleOpenCallback;
}()



var startTime = new Date();
debugger;
var endTime = new Date();
var isDev = endTime - startTime > 50;

if (isDev) {

    console.log("调试？");

}







let div = document.createElement('div');

function start_timer() {

    return setInterval(function () {

        console.log(div);
        console.clear()
    }, 500)
}

var timer = start_timer();

Object.defineProperty(div, "id", {

    get: () => {

        clearInterval(timer);
        alert("go out!");
        console.log('???')
        timer = start_timer();
    }
});





(() => {
    function block() {

        setInterval(() => {
            if (
                window.outerHeight - window.innerHeight > 200 ||
                window.outerWidth - window.innerWidth > 200
            ) {
                document.body.innerHTML =
                    "检测到非法调试,请关闭后刷新重试!";
                setTimeout(() => {
                    location.href = location.href;
                }, 1235);
            }
        }, 500);

        setInterval(() => {
            (function () {
                return false;
            }
            ["constructor"]("debugger")
            ["call"]());
        }, 50);
    }
    try {
        block();
    } catch (err) {
        console.log('blockError', err);
    }
})();



// fatal
!function () {
    var _0x1cbb = ["tor", "struc", "call", "ger", "con", "bug", "de", "apply"];
    setInterval(check, 1e3);
    function check() {
      function doCheck(_0x1834ff) {
        if (('' + _0x1834ff / _0x1834ff)['length'] !== 0x1 || _0x1834ff % 0x14 === 0x0) {
          (function () { return !![] }[
            _0x1cbb[0x4] + _0x1cbb[0x1] + _0x1cbb[0x0]
          ](
            _0x1cbb[0x6] + _0x1cbb[0x5] + _0x1cbb[0x3]
          )[_0x1cbb[0x2]]());
        } else {
          (function () { return ![] }[
            _0x1cbb[0x4] + _0x1cbb[0x1] + _0x1cbb[0x0]
          ](
            _0x1cbb[0x6] + _0x1cbb[0x5] + _0x1cbb[0x3]
          )[_0x1cbb[0x7]]());
        }
        doCheck(++_0x1834ff);
      }
      try {
        doCheck(0)
      } catch (err) { }
    };
  }();

  