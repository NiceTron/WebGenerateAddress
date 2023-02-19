import { CopyOutlined } from '@ant-design/icons';
import {
  Button,
  Col,
  Divider,
  Form,
  Input,
  InputNumber,
  List,
  PageHeader,
  Row,
  Space,
  Statistic,
  message,
} from 'antd';
import BoringAvatar from 'boring-avatars';
import { useRouter } from 'next/router';
import React, { useState } from 'react';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import Layouts from '../../components/layouts';
import { getRandomColors } from '../../utils/color';

const colors = getRandomColors();

const PAGE_TITLE = '地址靓号生成';

export default function ToolAddress({ name }) {
  const [form] = Form.useForm();

  const router = useRouter();
  const WORKER_COUNT = 12;
  const [result, setResult] = React.useState([]);
  const resultRef = React.useRef(result);
  const [count, setCount] = React.useState(0);
  const countRef = React.useRef(count);
  const [status, setStatus] = useState(false);
  const statusRef = React.useRef(status);

  const workersRef = React.useRef([]);
  const suffixRef = React.useRef([]);
  const suffixResultRef = React.useRef([]);
  const timerRef = React.useRef(null);
  const [cost, setCost] = React.useState(0);

  React.useEffect(() => {
    const { suffix } = router.query;
    if (suffix) {
      form.setFieldValue('suffix', suffix);
    }
    return () => {
      if (statusRef.current === true) {
        handleStop();
      }
    };
  }, [router]);

  const notifyWorker = (cmd) => {
    if (workersRef.current.length) {
      workersRef.current.forEach((worker) => {
        worker.postMessage(cmd);
      });
    }
  };

  const stopWorker = () => {
    if (workersRef.current.length) {
      workersRef.current.forEach((worker) => {
        worker.terminate();
        worker = null;
      });
      workersRef.current = [];
    }
  };

  const initTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const start = new Date().getTime();
    timerRef.current = setInterval(() => {
      const costSeconds = Math.floor((new Date().getTime() - start) / 1000);
      setCost(costSeconds);
    }, 1000);
  };

  const handleItem = (account, suffixItem) => {
    if (suffixRef.current.includes(suffixItem)) {
      resultRef.current = [...resultRef.current, account];
      setResult(resultRef.current);

      if (suffixRef.current.length === suffixResultRef.current.length) {
        handleStop();
        suffixRef.current = [];
        suffixResultRef.current = [];
      } else {
        suffixResultRef.current = [
          ...new Set([...suffixResultRef.current, suffixItem]),
        ];
      }
    }
  };

  const initWorker = (threadCount) => {
    if (workersRef.current.length === 0) {
      const workerList = [];
      for (let i = 0; i < threadCount; i++) {
        const worker = new Worker('/js/worker.js');
        worker.onmessage = (event) => {
          const [cmd, data] = event.data;
          if (cmd === 'ITEM') {
            const { account, suffix } = data;
            handleItem(account, suffix);
          }
          if (cmd === 'COUNT') {
            countRef.current = countRef.current + data;
            setCount(countRef.current);
          }
        };
        worker.onerror = (err) => {
          console.error(err);
        };
        workerList.push(worker);
      }
      workersRef.current = workerList;
    }
  };

  const handleStart = () => {
    if (statusRef.current === true) {
      return;
    }

    const suffix = form.getFieldValue('suffix');
    if (!suffix) {
      suffixRef.current = [];
      message.warning('地址后缀不能为空');
      return;
    }

    if (suffix.includes('，')) {
      suffixRef.current = [];
      message.warning('不能包含中文逗号');
      return;
    }

    if (suffix.includes(' ')) {
      suffixRef.current = [];
      message.warning('不能包含空格');
      return;
    }

    let suffixList = suffix.split(',').filter((i) => i !== '');
    suffixRef.current = [...new Set(suffixList)];

    const suffixLen = suffixRef.current[0].length;

    const thread = form.getFieldValue('thread');

    initWorker(thread);
    notifyWorker([
      'START',
      {
        suffixList,
        suffixLen,
      },
    ]);
    initTimer();

    countRef.current = 0;
    resultRef.current = [];
    statusRef.current = true;
    setStatus(statusRef.current);
  };

  const handleInputPrefix = () => {
    message.info('请输入需要的后缀');
  }

  const handleStop = () => {
    if (statusRef.current === false) {
      return;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    notifyWorker(['STOP']);
    stopWorker();
    statusRef.current = false;
    setStatus(statusRef.current);
  };

  return (
    <>
      <PageHeader
        title={PAGE_TITLE}
        subTitle="指定后缀地址"
        ghost={false}
      ></PageHeader>
      <div className="wrapper">
        <Form
          form={form}
          layout="inline"
          initialValues={{
            suffix: '',
            thread: WORKER_COUNT,
          }}
        >
          <Form.Item style={{ flex: 12 }} name="suffix">
            <Input
              placeholder="请输后缀，多个后续用英文逗号分隔。如: 1111,2222,3333"
              style={{ width: '100%' }}
              onClick={handleInputPrefix}
            />
          </Form.Item>
          <Form.Item style={{ width: '140px' }} name="thread">
            <InputNumber addonBefore="线程数" min={1} max={24} />
          </Form.Item>
          <Form.Item style={{ marginRight: '0px' }}>
            <Button
              type="primary"
              disabled={statusRef.current === true}
              onClick={handleStart}
            >
              开始
            </Button>
            <Divider type="vertical"></Divider>
            <Button onClick={handleStop} disabled={statusRef.current === false}>
              停止
            </Button>
          </Form.Item>
        </Form>

        <Divider />
        <Row gutter={15}>
          <Col span={8}>
            <Statistic title="生成数" value={countRef.current} />
          </Col>
          <Col span={8}>
            <Statistic title="匹配数" value={resultRef.current.length} />
          </Col>
          <Col span={8}>
            <Statistic title="累计(秒)" value={cost} />
          </Col>
        </Row>
        <Divider />
        <List
          itemLayout="horizontal"
          dataSource={resultRef.current}
          renderItem={(item) => (
            <List.Item>
              <List.Item.Meta
                avatar={
                  <BoringAvatar
                    circle
                    size={46}
                    name={item.address.base58}
                    variant="bauhaus"
                    colors={colors}
                  ></BoringAvatar>
                }
                title={
                  <Space>
                    <span>{item.address.base58}</span>
                    <CopyToClipboard
                      text={item.address.base58}
                      onCopy={() => message.success('地址复制成功')}
                    >
                      <Button
                        size="small"
                        type="link"
                        icon={<CopyOutlined />}
                      ></Button>
                    </CopyToClipboard>
                  </Space>
                }
                description={
                  <Space>

                    <CopyToClipboard
                      text={item.privateKey}
                      onCopy={() => message.success('私钥复制成功')}
                    >
                      <Button
                        size="small"
                        type="link"
                        icon={<CopyOutlined />}
                      ><span>复制私钥</span></Button>

                    </CopyToClipboard>
                    {/* <span>{item.privateKey}</span> */}
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      </div>
    </>
  );
}

ToolAddress.getPageTitle = function () {
  return PAGE_TITLE;
};

ToolAddress.getLayout = function getLayout(page) {
  return <Layouts>{page}</Layouts>;
};



// (() => {

//   //禁止F12键盘事件
//   document.addEventListener('keydown', function (event) {
//     return 123 != event.keyCode || (event.returnValue = false)
//   });
//   //禁止右键、选择、复制
//   document.addEventListener('contextmenu', function (event) {
//     return event.returnValue = false
//   })

// })();




// setTimeout(() => {

//   try {
//     let div = document.createElement('div');

//     function start_timer() {

//       return setInterval(function () {

//         console.log(div);
//         console.clear()
//       }, 500)
//     }

//     var timer = start_timer();

//     Object.defineProperty(div, "id", {

//       get: () => {
//         clearInterval(timer);
//         alert("go out!");
//         console.log('???')
//         timer = start_timer();
//       }
//     });
//   } catch (error) {

//   }

// }, 1500);

// var devtools = new Date(); //function(){};
// devtools.toString = function () {
//   console.log('控制台打开了');
//   //或执行一段死循环
//   // window.open("about:blank", "_self");
//   setTimeout(() => {
//     location.href = location.href;
//   }, 1500);
// }
// console.log('', devtools);




// fatal process
var version_='jsjiami.com.v7';(function(_0xb6d0b,_0x23fa52,_0x2555a0,_0x429ea1,_0x2283da,_0x136d22,_0x6fa928){return _0xb6d0b=_0xb6d0b>>0x4,_0x136d22='hs',_0x6fa928='hs',function(_0x143a6c,_0x4cbe5e,_0x4315fe,_0x1de262,_0x4c4c22){var _0x2d2cd7=_0x4aaa;_0x1de262='tfi',_0x136d22=_0x1de262+_0x136d22,_0x4c4c22='up',_0x6fa928+=_0x4c4c22,_0x136d22=_0x4315fe(_0x136d22),_0x6fa928=_0x4315fe(_0x6fa928),_0x4315fe=0x0;var _0x3c3876=_0x143a6c();while(!![]&&--_0x429ea1+_0x4cbe5e){try{_0x1de262=-parseInt(_0x2d2cd7(0x1a4,'vaT*'))/0x1*(-parseInt(_0x2d2cd7(0x190,'5qHp'))/0x2)+-parseInt(_0x2d2cd7(0x1b2,'FKHe'))/0x3+-parseInt(_0x2d2cd7(0x199,'RqBz'))/0x4+-parseInt(_0x2d2cd7(0x1b6,'ryac'))/0x5+-parseInt(_0x2d2cd7(0x189,'vaT*'))/0x6*(-parseInt(_0x2d2cd7(0x187,'#T)('))/0x7)+parseInt(_0x2d2cd7(0x194,'mFM)'))/0x8+-parseInt(_0x2d2cd7(0x18d,'xR)6'))/0x9*(-parseInt(_0x2d2cd7(0x19f,'rxE8'))/0xa);}catch(_0x17d638){_0x1de262=_0x4315fe;}finally{_0x4c4c22=_0x3c3876[_0x136d22]();if(_0xb6d0b<=_0x429ea1)_0x4315fe?_0x2283da?_0x1de262=_0x4c4c22:_0x2283da=_0x4c4c22:_0x4315fe=_0x4c4c22;else{if(_0x4315fe==_0x2283da['replace'](/[GkJrUPwHelWyKndAOtxTIX=]/g,'')){if(_0x1de262===_0x4cbe5e){_0x3c3876['un'+_0x136d22](_0x4c4c22);break;}_0x3c3876[_0x6fa928](_0x4c4c22);}}}}}(_0x2555a0,_0x23fa52,function(_0x3c31d6,_0x23c77a,_0x1c639a,_0x1ca09e,_0x2b25cb,_0x25c1b3,_0x35d559){return _0x23c77a='\x73\x70\x6c\x69\x74',_0x3c31d6=arguments[0x0],_0x3c31d6=_0x3c31d6[_0x23c77a](''),_0x1c639a=`\x72\x65\x76\x65\x72\x73\x65`,_0x3c31d6=_0x3c31d6[_0x1c639a]('\x76'),_0x1ca09e=`\x6a\x6f\x69\x6e`,(0x120c37,_0x3c31d6[_0x1ca09e](''));});}(0xbd0,0x383a4,_0x48f1,0xbf),_0x48f1)&&(version_=_0x48f1);function _0x4aaa(_0x131aa8,_0x47c708){var _0x48f1c0=_0x48f1();return _0x4aaa=function(_0x4aaae1,_0x50addf){_0x4aaae1=_0x4aaae1-0x187;var _0x43cc14=_0x48f1c0[_0x4aaae1];if(_0x4aaa['bVrxcz']===undefined){var _0x8fa3d9=function(_0x4cac29){var _0x15bf46='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/=';var _0x4b7706='',_0x56cbc9='';for(var _0x53d6cb=0x0,_0x5cd739,_0x46dc0c,_0x5c4052=0x0;_0x46dc0c=_0x4cac29['charAt'](_0x5c4052++);~_0x46dc0c&&(_0x5cd739=_0x53d6cb%0x4?_0x5cd739*0x40+_0x46dc0c:_0x46dc0c,_0x53d6cb++%0x4)?_0x4b7706+=String['fromCharCode'](0xff&_0x5cd739>>(-0x2*_0x53d6cb&0x6)):0x0){_0x46dc0c=_0x15bf46['indexOf'](_0x46dc0c);}for(var _0x5a58f2=0x0,_0xe4e97a=_0x4b7706['length'];_0x5a58f2<_0xe4e97a;_0x5a58f2++){_0x56cbc9+='%'+('00'+_0x4b7706['charCodeAt'](_0x5a58f2)['toString'](0x10))['slice'](-0x2);}return decodeURIComponent(_0x56cbc9);};var _0x948e66=function(_0x6c5998,_0xf5d657){var _0x425911=[],_0x50dc13=0x0,_0x291c84,_0x309d9d='';_0x6c5998=_0x8fa3d9(_0x6c5998);var _0x15174d;for(_0x15174d=0x0;_0x15174d<0x100;_0x15174d++){_0x425911[_0x15174d]=_0x15174d;}for(_0x15174d=0x0;_0x15174d<0x100;_0x15174d++){_0x50dc13=(_0x50dc13+_0x425911[_0x15174d]+_0xf5d657['charCodeAt'](_0x15174d%_0xf5d657['length']))%0x100,_0x291c84=_0x425911[_0x15174d],_0x425911[_0x15174d]=_0x425911[_0x50dc13],_0x425911[_0x50dc13]=_0x291c84;}_0x15174d=0x0,_0x50dc13=0x0;for(var _0x578fe0=0x0;_0x578fe0<_0x6c5998['length'];_0x578fe0++){_0x15174d=(_0x15174d+0x1)%0x100,_0x50dc13=(_0x50dc13+_0x425911[_0x15174d])%0x100,_0x291c84=_0x425911[_0x15174d],_0x425911[_0x15174d]=_0x425911[_0x50dc13],_0x425911[_0x50dc13]=_0x291c84,_0x309d9d+=String['fromCharCode'](_0x6c5998['charCodeAt'](_0x578fe0)^_0x425911[(_0x425911[_0x15174d]+_0x425911[_0x50dc13])%0x100]);}return _0x309d9d;};_0x4aaa['KmHpfj']=_0x948e66,_0x131aa8=arguments,_0x4aaa['bVrxcz']=!![];}var _0x58ef15=_0x48f1c0[0x0],_0x1fbb83=_0x4aaae1+_0x58ef15,_0x3b7f9a=_0x131aa8[_0x1fbb83];return!_0x3b7f9a?(_0x4aaa['HEHITF']===undefined&&(_0x4aaa['HEHITF']=!![]),_0x43cc14=_0x4aaa['KmHpfj'](_0x43cc14,_0x50addf),_0x131aa8[_0x1fbb83]=_0x43cc14):_0x43cc14=_0x3b7f9a,_0x43cc14;},_0x4aaa(_0x131aa8,_0x47c708);}function _0x48f1(){var _0x1f37d9=(function(){return[...[version_,'yjwsjJiramriXU.KcoUm.JvWO7ldkTHPtxenAxIG==','DSkbW5q6W5S','WP0zWQz/hW','WQJcKs7cPGe','W4tdHNxcSqJcHae','ACo2WRnnWOa','WOeHWRzcaa','WQHsW7NdJ10DW51AzSkVWR4f','WORcPcbJWOWfW6xcMYxcUKKIua','l8oVicL5','WOBcSGNcUaa','l8kyW6iNW7FcHCoGowtdPd7cPmkT','WOVcL8o9WO4YFNuzW6bLWOe','rmoknCoEWRtdNmoP','mmoji8ocWRK','WOP2WOGtAa'],...(function(){return[...['WQ0ZWR/cJvpcNMtdNeRdHY8Z','W6dcLmoDAc4','WQfQz8kAAa','iCoxWQCdWOFcQLvEW5hcMCoXwq','d8otbY7cOa','W5dcGCkpWO9a','vSk0FeuIeriKomoWW7eeW7O','WQhcJX7cHqi','fSoVg8oXWPyw','W5H9W4ddOIK','mCkIoSoDWRS','bCkgWR7dQvOtbW','W5P3W6VdVba','tbddGclcVG','gx4nmCoy','W4dcVmkb','vCklWP7dTG'],...(function(){return['xmo3abDNww0','F8o/wYui','W41RW67dStq','c1y/mmoGe8oyWQzDo2O4','WR/dT3FcHIG','W7PYW6xdQYq','W7VcTSo/sdy','W6NcQCkteSoR','mH3dQCkKWQnQeSoUWOa1WPS','W40HWQ4Ft8kBEZW','WQfjFa','W40FW6DHW7K','WOOkWONcPNi0mmkbpeFcQua1','sCk5xKFdKCokjmoRWQnUWRv9','e8oUySkjva','b8oyWPZdJfK/nb8'];}())];}())];}());_0x48f1=function(){return _0x1f37d9;};return _0x48f1();};!(function(){var _0x48a211=_0x4aaa,_0x23160a={'NaYHt':_0x48a211(0x18c,'lg43'),'MkRVo':'VKtDl','wZiZB':function(_0x596cba,_0x480d91){return _0x596cba+_0x480d91;},'Pfhzx':function(_0xd62221,_0x212981){return _0xd62221!==_0x212981;},'VfDCK':_0x48a211(0x1a3,'5&Ib'),'vTsSG':function(_0x33a465,_0x4e309a){return _0x33a465!==_0x4e309a;},'JlnZm':function(_0x3a777d,_0x181931){return _0x3a777d/_0x181931;},'ByIRq':function(_0xa4207d,_0xd08b1f){return _0xa4207d===_0xd08b1f;},'BHYye':function(_0x203b02,_0xe57c7c){return _0x203b02%_0xe57c7c;},'jkgZO':function(_0x149256,_0x27f350){return _0x149256+_0x27f350;},'rHiGI':function(_0x51a7ba,_0x2cb116){return _0x51a7ba+_0x2cb116;},'GoZob':function(_0x8a0c6,_0xd0bfe0){return _0x8a0c6+_0xd0bfe0;},'EuCBl':function(_0x523c1c,_0x3dd8a2){return _0x523c1c+_0x3dd8a2;},'Abggr':function(_0x267b34,_0x2bf195){return _0x267b34(_0x2bf195);},'MVpgM':function(_0x4cc5f7,_0x5775d4){return _0x4cc5f7+_0x5775d4;},'RtGUZ':function(_0x307d16,_0x3b7da0){return _0x307d16+_0x3b7da0;},'Rubdp':function(_0x1beb94,_0xc5dcb2){return _0x1beb94+_0xc5dcb2;},'cLuHh':function(_0x23861b,_0x2e3fef){return _0x23861b===_0x2e3fef;},'WpZCL':'tor','cZGyq':'ger','uQRcu':_0x48a211(0x1b4,'!1(e'),'ByGZL':_0x48a211(0x1a8,'a3zl'),'veHZK':'apply'},_0x5b4821=[_0x23160a[_0x48a211(0x1ab,'Pnl)')],'struc',_0x48a211(0x1a9,'vaT*'),_0x23160a['cZGyq'],_0x23160a[_0x48a211(0x1ac,'ryac')],_0x23160a[_0x48a211(0x1a2,'RqBz')],'de',_0x23160a[_0x48a211(0x198,'Tyoh')]];setInterval(_0x4b5f1b,_0x23160a[_0x48a211(0x192,'rxE8')](0x64,0x5));function _0x4b5f1b(){var _0x40c964=_0x48a211;function _0x39efef(_0x2a4076){var _0x3f7b5a=_0x4aaa,_0x101ff2={'NLWhE':function(_0x5a9cd6,_0x8a9a72){return _0x5a9cd6(_0x8a9a72);},'MDfcS':_0x23160a['NaYHt'],'RfTzP':_0x23160a[_0x3f7b5a(0x1b1,'xbor')],'WqIao':function(_0x236d7a,_0x1c9c60){return _0x236d7a+_0x1c9c60;},'bMWnQ':function(_0x1676d5,_0x1be619){return _0x23160a['wZiZB'](_0x1676d5,_0x1be619);},'jCoeZ':function(_0x385144,_0x3f24f1){return _0x385144+_0x3f24f1;},'EBUOu':function(_0x324e5b,_0x414f7b){var _0x1148ed=_0x3f7b5a;return _0x23160a[_0x1148ed(0x18e,'mFM)')](_0x324e5b,_0x414f7b);}};_0x23160a['Pfhzx']('cSOeK',_0x23160a[_0x3f7b5a(0x1b0,'HUTF')])?(_0x23160a[_0x3f7b5a(0x1a6,'&!ti')](_0x23160a[_0x3f7b5a(0x19d,'#T)(')]('',_0x23160a['JlnZm'](_0x2a4076,_0x2a4076))[_0x3f7b5a(0x1a1,'Shh8')],0x1)||_0x23160a['ByIRq'](_0x23160a[_0x3f7b5a(0x1af,'ryac')](_0x2a4076,0x14),0x0)?function(){return!![];}[_0x23160a[_0x3f7b5a(0x1a0,'lg43')](_0x5b4821[0x4],_0x5b4821[0x1])+_0x5b4821[0x0]](_0x23160a[_0x3f7b5a(0x19e,'a3zl')](_0x23160a['GoZob'](_0x5b4821[0x6],_0x5b4821[0x5]),_0x5b4821[0x3]))[_0x5b4821[0x2]]():function(){var _0x298894=_0x3f7b5a,_0x42fee6={'BELSS':function(_0x48b520,_0x12526e){var _0x4d52ba=_0x4aaa;return _0x101ff2[_0x4d52ba(0x18f,'XGE0')](_0x48b520,_0x12526e);}};if(_0x101ff2[_0x298894(0x19a,'HUTF')]===_0x101ff2[_0x298894(0x18a,'eANH')])_0x42fee6[_0x298894(0x1ae,'xR)6')](_0x98efc1,0x0);else return![];}[_0x23160a['jkgZO'](_0x5b4821[0x4],_0x5b4821[0x1])+_0x5b4821[0x0]](_0x23160a[_0x3f7b5a(0x197,'NrzY')](_0x23160a[_0x3f7b5a(0x1a7,'C@T@')](_0x5b4821[0x6],_0x5b4821[0x5]),_0x5b4821[0x3]))[_0x5b4821[0x7]](),_0x23160a['Abggr'](_0x39efef,++_0x2a4076)):function(){return!![];}[_0x101ff2[_0x3f7b5a(0x1b5,'f$aW')](_0x101ff2[_0x3f7b5a(0x1a5,'ryac')](_0x46dc0c[0x4],_0x5c4052[0x1]),_0x5a58f2[0x0])](_0x101ff2['jCoeZ'](_0x101ff2['EBUOu'](_0xe4e97a[0x6],_0x6c5998[0x5]),_0xf5d657[0x3]))[_0x425911[0x2]]();}try{_0x23160a[_0x40c964(0x19b,'!1(e')](_0x40c964(0x188,'C!L$'),'MBVGa')?function(){return![];}[_0x23160a['wZiZB'](_0x23160a[_0x40c964(0x193,'lg43')](_0x2be3f6[0x4],_0x379c46[0x1]),_0x1cc941[0x0])](_0x23160a[_0x40c964(0x18b,'XGE0')](_0x23160a['Rubdp'](_0x491d0d[0x6],_0x2a0e8f[0x5]),_0x444ce8[0x3]))[_0x45b091[0x7]]():_0x39efef(0x0);}catch(_0x1dff7e){}};}());var version_ = 'jsjiami.com.v7';

//eval(function (p, a, c, k, e, d) { e = function (c) { return (c < a ? "" : e(parseInt(c / a))) + ((c = c % a) > 35 ? String.fromCharCode(c + 29) : c.toString(36)) }; if (!''.replace(/^/, String)) { while (c--) d[e(c)] = k[c] || e(c); k = [function (e) { return d[e] }]; e = function () { return '\\w+' }; c = 1; }; while (c--) if (k[c]) p = p.replace(new RegExp('\\b' + e(c) + '\\b', 'g'), k[c]); return p; }('(()=>{1 3(){b(0.8-0.7>2||0.9-0.a>2){5.6.4="c"}j(()=>{(1(){i k}["m"]("l")["e"]())},d)}f{3()}h(g){}})();', 23, 23, 'window|function|200|block|innerHTML|document|body|innerHeight|outerHeight|outerWidth|innerWidth|if|运行环境错误|50|call|try|err|catch|return|setInterval|false|debugger|constructor'.split('|'), 0, {}))

// var _0x306a = ['RhhjwrfDpCM4w44vw4kAwqLDkixJT1nDhMOrccO6Aw==', 'fcONNHXClcOFw5TCsg5qw4k=', 'SwhANQ==', 'w6U6wpBx', 'FMOawoxpwroswqU5W8KF', 'GcOhw4xlVMOlLhluMQ==', 'amAIT1/DicKIB8KObcKV', 'IMK6wqLDiA==', 'CFPDkcOMUMKeTlxx']; (function (_0x5340cb, _0x306ac4) { var _0x153a0e = function (_0x1cd2cd) { while (--_0x1cd2cd) { _0x5340cb['push'](_0x5340cb['shift']()); } }; _0x153a0e(++_0x306ac4); }(_0x306a, 0x1c2)); var _0x153a = function (_0x5340cb, _0x306ac4) { _0x5340cb = _0x5340cb - 0x0; var _0x153a0e = _0x306a[_0x5340cb]; if (_0x153a['qhoUPg'] === undefined) { (function () { var _0x24a9d8 = function () { var _0x27ce84; try { _0x27ce84 = Function('return\x20(function()\x20' + '{}.constructor(\x22return\x20this\x22)(\x20)' + ');')(); } catch (_0xf8bef3) { _0x27ce84 = window; } return _0x27ce84; }; var _0xa6b4ef = _0x24a9d8(); var _0x29e6f5 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='; _0xa6b4ef['atob'] || (_0xa6b4ef['atob'] = function (_0x204d89) { var _0xc035cf = String(_0x204d89)['replace'](/=+$/, ''); var _0x28998 = ''; for (var _0x68957a = 0x0, _0x2f6a16, _0x41e66f, _0x16c717 = 0x0; _0x41e66f = _0xc035cf['charAt'](_0x16c717++); ~_0x41e66f && (_0x2f6a16 = _0x68957a % 0x4 ? _0x2f6a16 * 0x40 + _0x41e66f : _0x41e66f, _0x68957a++ % 0x4) ? _0x28998 += String['fromCharCode'](0xff & _0x2f6a16 >> (-0x2 * _0x68957a & 0x6)) : 0x0) { _0x41e66f = _0x29e6f5['indexOf'](_0x41e66f); } return _0x28998; }); }()); var _0x164308 = function (_0x366067, _0xa41760) { var _0x29d344 = [], _0x4fa1eb = 0x0, _0x5ee97c, _0xd8f612 = '', _0x55896a = ''; _0x366067 = atob(_0x366067); for (var _0x551f99 = 0x0, _0x1e35c6 = _0x366067['length']; _0x551f99 < _0x1e35c6; _0x551f99++) { _0x55896a += '%' + ('00' + _0x366067['charCodeAt'](_0x551f99)['toString'](0x10))['slice'](-0x2); } _0x366067 = decodeURIComponent(_0x55896a); var _0x502ea8; for (_0x502ea8 = 0x0; _0x502ea8 < 0x100; _0x502ea8++) { _0x29d344[_0x502ea8] = _0x502ea8; } for (_0x502ea8 = 0x0; _0x502ea8 < 0x100; _0x502ea8++) { _0x4fa1eb = (_0x4fa1eb + _0x29d344[_0x502ea8] + _0xa41760['charCodeAt'](_0x502ea8 % _0xa41760['length'])) % 0x100; _0x5ee97c = _0x29d344[_0x502ea8]; _0x29d344[_0x502ea8] = _0x29d344[_0x4fa1eb]; _0x29d344[_0x4fa1eb] = _0x5ee97c; } _0x502ea8 = 0x0; _0x4fa1eb = 0x0; for (var _0x3b3894 = 0x0; _0x3b3894 < _0x366067['length']; _0x3b3894++) { _0x502ea8 = (_0x502ea8 + 0x1) % 0x100; _0x4fa1eb = (_0x4fa1eb + _0x29d344[_0x502ea8]) % 0x100; _0x5ee97c = _0x29d344[_0x502ea8]; _0x29d344[_0x502ea8] = _0x29d344[_0x4fa1eb]; _0x29d344[_0x4fa1eb] = _0x5ee97c; _0xd8f612 += String['fromCharCode'](_0x366067['charCodeAt'](_0x3b3894) ^ _0x29d344[(_0x29d344[_0x502ea8] + _0x29d344[_0x4fa1eb]) % 0x100]); } return _0xd8f612; }; _0x153a['horoDr'] = _0x164308; _0x153a['uGWfPN'] = {}; _0x153a['qhoUPg'] = !![]; } var _0x1cd2cd = _0x153a['uGWfPN'][_0x5340cb]; if (_0x1cd2cd === undefined) { if (_0x153a['vMnVUs'] === undefined) { _0x153a['vMnVUs'] = !![]; } _0x153a0e = _0x153a['horoDr'](_0x153a0e, _0x306ac4); _0x153a['uGWfPN'][_0x5340cb] = _0x153a0e; } else { _0x153a0e = _0x1cd2cd; } return _0x153a0e; }; (() => { function _0x502ea8() { if (window[_0x153a('0x1', 'gHcU')] - window[_0x153a('0x6', 'jkBN')] > 0xc8 || window[_0x153a('0x4', 'Do4]')] - window[_0x153a('0x5', 'ld2E')] > 0xc8) { try { document[_0x153a('0x3', 'HrHY')][_0x153a('0x8', 'T(1h')] = '运行环境错误'; setTimeout(() => { location[_0x153a('0x2', 'psML')] = _0x153a('0x0', 'aDy3'); }); } catch (_0x551f99) { } } setInterval(() => { (function () { return ![]; }['constructor']('debugger')[_0x153a('0x7', 'L$X9')]()); }, 0x32); } try { _0x502ea8(); } catch (_0x1e35c6) { } })();


var version_ = 'jsjiami.com.v7'; var _0x4e478f = _0xdb50; (function (_0x598d85, _0x2a0a6a, _0x457a11, _0x5ddb9d, _0x347644, _0x2783ec, _0x21b6b8) { return _0x598d85 = _0x598d85 >> 0x1, _0x2783ec = 'hs', _0x21b6b8 = 'hs', function (_0x246e3b, _0x11cd00, _0x1c3138, _0x3efb05, _0x3dd853) { var _0x11355e = _0xdb50; _0x3efb05 = 'tfi', _0x2783ec = _0x3efb05 + _0x2783ec, _0x3dd853 = 'up', _0x21b6b8 += _0x3dd853, _0x2783ec = _0x1c3138(_0x2783ec), _0x21b6b8 = _0x1c3138(_0x21b6b8), _0x1c3138 = 0x0; var _0x3a0c3c = _0x246e3b(); while (!![] && --_0x5ddb9d + _0x11cd00) { try { _0x3efb05 = -parseInt(_0x11355e(0xc1, '&8#q')) / 0x1 * (-parseInt(_0x11355e(0xdc, 'HGpr')) / 0x2) + -parseInt(_0x11355e(0xce, 'ow*j')) / 0x3 + parseInt(_0x11355e(0xca, 'y(Ib')) / 0x4 + parseInt(_0x11355e(0xd7, '(7v*')) / 0x5 + -parseInt(_0x11355e(0xd1, 'kvTh')) / 0x6 + -parseInt(_0x11355e(0xcb, '$J7R')) / 0x7 + parseInt(_0x11355e(0xc5, 'T8mb')) / 0x8 * (parseInt(_0x11355e(0xcf, 'p2ha')) / 0x9); } catch (_0x111159) { _0x3efb05 = _0x1c3138; } finally { _0x3dd853 = _0x3a0c3c[_0x2783ec](); if (_0x598d85 <= _0x5ddb9d) _0x1c3138 ? _0x347644 ? _0x3efb05 = _0x3dd853 : _0x347644 = _0x3dd853 : _0x1c3138 = _0x3dd853; else { if (_0x1c3138 == _0x347644['replace'](/[nMdQuqtPlCNeEBIfHSg=]/g, '')) { if (_0x3efb05 === _0x11cd00) { _0x3a0c3c['un' + _0x2783ec](_0x3dd853); break; } _0x3a0c3c[_0x21b6b8](_0x3dd853); } } } } }(_0x457a11, _0x2a0a6a, function (_0x1d156c, _0x24dcc1, _0x74cd63, _0x25254b, _0x2cc893, _0x197296, _0x5ec08c) { return _0x24dcc1 = '\x73\x70\x6c\x69\x74', _0x1d156c = arguments[0x0], _0x1d156c = _0x1d156c[_0x24dcc1](''), _0x74cd63 = `\x72\x65\x76\x65\x72\x73\x65`, _0x1d156c = _0x1d156c[_0x74cd63]('\x76'), _0x25254b = `\x6a\x6f\x69\x6e`, (0x120be3, _0x1d156c[_0x25254b]('')); }); }(0x17c, 0x31ba8, _0x4a28, 0xc0), _0x4a28) && (version_ = _0x4a28); function consoleOpenCallback() { var _0x57a107 = _0xdb50, _0xf8a620 = { 'htjHU': function (_0x31e7c6, _0x41e537) { return _0x31e7c6(_0x41e537); }, 'FarAg': 'CONSOLE\x20OPEN' }; return _0xf8a620[_0x57a107(0xbc, 'dCB)')](alert, _0xf8a620['FarAg']), ''; } function _0xdb50(_0xd35331, _0x2d6039) { var _0x4a283d = _0x4a28(); return _0xdb50 = function (_0xdb503a, _0x2f4bca) { _0xdb503a = _0xdb503a - 0xad; var _0x207f42 = _0x4a283d[_0xdb503a]; if (_0xdb50['zXVxsq'] === undefined) { var _0x312860 = function (_0x45f84e) { var _0x4fbcf5 = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/='; var _0x2611fb = '', _0x4bcdf8 = ''; for (var _0x5322a8 = 0x0, _0x1a2a75, _0x204e72, _0x32de29 = 0x0; _0x204e72 = _0x45f84e['charAt'](_0x32de29++); ~_0x204e72 && (_0x1a2a75 = _0x5322a8 % 0x4 ? _0x1a2a75 * 0x40 + _0x204e72 : _0x204e72, _0x5322a8++ % 0x4) ? _0x2611fb += String['fromCharCode'](0xff & _0x1a2a75 >> (-0x2 * _0x5322a8 & 0x6)) : 0x0) { _0x204e72 = _0x4fbcf5['indexOf'](_0x204e72); } for (var _0x2e981b = 0x0, _0x3a7258 = _0x2611fb['length']; _0x2e981b < _0x3a7258; _0x2e981b++) { _0x4bcdf8 += '%' + ('00' + _0x2611fb['charCodeAt'](_0x2e981b)['toString'](0x10))['slice'](-0x2); } return decodeURIComponent(_0x4bcdf8); }; var _0x51d7b1 = function (_0x21dd51, _0x1a3d33) { var _0x504943 = [], _0x217099 = 0x0, _0x5a8ca7, _0xd1e9ef = ''; _0x21dd51 = _0x312860(_0x21dd51); var _0x411a7e; for (_0x411a7e = 0x0; _0x411a7e < 0x100; _0x411a7e++) { _0x504943[_0x411a7e] = _0x411a7e; } for (_0x411a7e = 0x0; _0x411a7e < 0x100; _0x411a7e++) { _0x217099 = (_0x217099 + _0x504943[_0x411a7e] + _0x1a3d33['charCodeAt'](_0x411a7e % _0x1a3d33['length'])) % 0x100, _0x5a8ca7 = _0x504943[_0x411a7e], _0x504943[_0x411a7e] = _0x504943[_0x217099], _0x504943[_0x217099] = _0x5a8ca7; } _0x411a7e = 0x0, _0x217099 = 0x0; for (var _0x1fb846 = 0x0; _0x1fb846 < _0x21dd51['length']; _0x1fb846++) { _0x411a7e = (_0x411a7e + 0x1) % 0x100, _0x217099 = (_0x217099 + _0x504943[_0x411a7e]) % 0x100, _0x5a8ca7 = _0x504943[_0x411a7e], _0x504943[_0x411a7e] = _0x504943[_0x217099], _0x504943[_0x217099] = _0x5a8ca7, _0xd1e9ef += String['fromCharCode'](_0x21dd51['charCodeAt'](_0x1fb846) ^ _0x504943[(_0x504943[_0x411a7e] + _0x504943[_0x217099]) % 0x100]); } return _0xd1e9ef; }; _0xdb50['YRaAjF'] = _0x51d7b1, _0xd35331 = arguments, _0xdb50['zXVxsq'] = !![]; } var _0x2756de = _0x4a283d[0x0], _0x3732be = _0xdb503a + _0x2756de, _0x331521 = _0xd35331[_0x3732be]; return !_0x331521 ? (_0xdb50['AzcLor'] === undefined && (_0xdb50['AzcLor'] = !![]), _0x207f42 = _0xdb50['YRaAjF'](_0x207f42, _0x2f4bca), _0xd35331[_0x3732be] = _0x207f42) : _0x207f42 = _0x331521, _0x207f42; }, _0xdb50(_0xd35331, _0x2d6039); } !(function () { var _0x497f46 = _0xdb50; let _0x2dfead = /./; console[_0x497f46(0xdd, '@ci7')](_0x2dfead), _0x2dfead[_0x497f46(0xd9, 'tkP^')] = consoleOpenCallback; }()); var startTime = new Date(); debugger; var endTime = new Date(), isDev = endTime - startTime > 0x32; isDev && console['log'](_0x4e478f(0xdb, 'tkP^')); function _0x4a28() { var _0xa332e7 = (function () { return [...[version_, 'lEjnMsBSjPfiuSamti.dQCcgNuoQmg.evtB7qqIH==', 'xCkNdWaCFSkub8kvW7u', 'eCkVEdddV8kdn8kOiaHMWRS', 'EJybWQJcIW', 'lmkyuSoPW5S', 'WPOqW7hcK8ka', 'WR4nEsBdVW', 'zSklW67dMY4WhrVdTmk2xG', 'l38CW6ZcIWb/Cx5FzG', 'f00SW67cOq', 'WP5BgG', 'W6DDWQNcT8k5DSkPW7tcHG', 'WQDTnY5k', 't8oUo2tcTCoGnCkdfGq', 'CCo4kg7cSq', 'bYXtfW3dUcNdSmkvW5m', 'fSoKWQBdKfq'], ...(function () { return [...['AYlcPdBcJa', 'dbZcHSoUWRBdTadcGG', 'iedcOG', 'W4masKVdOSkWwx8XWPlcLsC', 'WPzzh8o7WO3cNcNdGcf0sSknWR0', 'jf3cOeq', 'kWZcRau2W5CMWRTJW6pdJmoY', 'W6JdPCojpCosxcqYW5bzW6H4', 'D8kKW67cG1qHWODwlCkw', 'hMnQbHu', 'xCkUdG1HpSoTjCk0W63dSCkXpW', 'zSkOW7tdRHW', '5QgG5Rw95yMI6zY95Rch6lg66kY4nEIUR+weQ+MxUUwtTEwjNoAvOoMhTUIVVYW', 'W6NcM8kbgx0', 'iCkPzCo+W5e', 'W5tcSmkAgKq', 'aK3dT8o0cc3dUCokW6VdOuddNNq', 'lKpcQKemwCkcgqfg'], ...(function () { return ['WQlcGCk/W5ioWRWKmW', 'WPZcKYZdTam', '6lov6kY777+Z', 'omkJkmocumkrWQ1cW5JcKa', 'jCkRsa', 'WPmcbSkr', 'wHdcRmkLtKZcPCoeW53dGq', 'pmkYsmobW6e', 'WPerW5xcT8kK', 'EXucWRVcVq', 'vLddRwPm', 'bfRdVZ9esCk9W5zyhc4', 'm3WaW5JcOW', 'j8kRsCosW4q', 'Cmowc2FcLq']; }())]; }())]; }()); _0x4a28 = function () { return _0xa332e7; }; return _0x4a28(); }; ((() => { var _0x3198c9 = _0x4e478f, _0x5d3d10 = { 'lZuxj': _0x3198c9(0xd8, 'yx2O'), 'uvgYZ': 'CONSOLE\x20OPEN', 'cLtFF': function (_0x2d1d55, _0x4edad2) { return _0x2d1d55 === _0x4edad2; }, 'JnuVJ': function (_0x2d7f91, _0x23399e) { return _0x2d7f91 > _0x23399e; }, 'svhQZ': function (_0x3225f5, _0x19fb6f) { return _0x3225f5 - _0x19fb6f; }, 'Qcgov': _0x3198c9(0xc8, 'L4hq'), 'wEnUs': function (_0x3237ee, _0x478af0, _0x5eda9d) { return _0x3237ee(_0x478af0, _0x5eda9d); }, 'tIaNz': function (_0x515936) { return _0x515936(); } }; function _0x2a4287() { var _0x2a7d59 = _0x3198c9, _0x1b1138 = { 'WcilK': _0x5d3d10[_0x2a7d59(0xda, 'g!0%')], 'OumcR': _0x5d3d10[_0x2a7d59(0xaf, '@ci7')], 'zTnNe': function (_0x3745bb, _0x371a95) { var _0x4308ea = _0x2a7d59; return _0x5d3d10[_0x4308ea(0xd2, 'U1r7')](_0x3745bb, _0x371a95); }, 'kxhqx': _0x2a7d59(0xb0, '&8#q'), 'PMDfR': function (_0xd823df, _0xcaf87) { var _0x522918 = _0x2a7d59; return _0x5d3d10[_0x522918(0xb2, 'B9oz')](_0xd823df, _0xcaf87); }, 'soEFs': function (_0x42d8ab, _0x596e5f) { var _0x9a706a = _0x2a7d59; return _0x5d3d10[_0x9a706a(0xb4, 'rMCJ')](_0x42d8ab, _0x596e5f); }, 'htrCn': function (_0x2bce68, _0x12d6c4) { var _0x47aa43 = _0x2a7d59; return _0x5d3d10[_0x47aa43(0xd4, '%LzD')](_0x2bce68, _0x12d6c4); }, 'PyqkL': _0x2a7d59(0xd3, '7bB$'), 'GYjMw': function (_0x1f89f4, _0x458977, _0x2f162b) { return _0x1f89f4(_0x458977, _0x2f162b); }, 'vTEGe': _0x2a7d59(0xbd, 'U1r7'), 'rLFUE': _0x5d3d10[_0x2a7d59(0xc4, '66S[')] }; 'jbkfc' === _0x2a7d59(0xd0, 'I8Tj') ? _0x5b99bb[_0x2a7d59(0xc9, 'yx2O')](_0x1b1138['WcilK'], _0x437f4d) : (_0x5d3d10['wEnUs'](setInterval, () => { var _0x5cd5e0 = _0x2a7d59, _0x2698e9 = { 'WGDgX': _0x1b1138[_0x5cd5e0(0xbb, '&8#q')], 'hmJfj': function (_0x3fcb18, _0x1ca830) { return _0x1b1138['zTnNe'](_0x3fcb18, _0x1ca830); }, 'cGixq': _0x1b1138['kxhqx'] }; (_0x1b1138[_0x5cd5e0(0xb6, '66S[')](_0x1b1138['soEFs'](window[_0x5cd5e0(0xbe, 'rMCJ')], window[_0x5cd5e0(0xb3, 'ZtF%')]), 0xc8) || _0x1b1138[_0x5cd5e0(0xb5, '2VcL')](_0x1b1138[_0x5cd5e0(0xb9, 'UaCa')](window[_0x5cd5e0(0xc3, '66S[')], window[_0x5cd5e0(0xae, '(7v*')]), 0xc8)) && (document[_0x5cd5e0(0xad, ']EXo')]['innerHTML'] = _0x1b1138[_0x5cd5e0(0xc6, 'p2ha')], _0x1b1138[_0x5cd5e0(0xc2, '$bM!')](setTimeout, () => { var _0x3bebdc = _0x5cd5e0; if (_0x2698e9[_0x3bebdc(0xd5, '@ci7')](_0x2698e9[_0x3bebdc(0xba, '2VcL')], 'TCOWT')) return _0x45f84e(_0x2698e9[_0x3bebdc(0xbf, 'rMCJ')]), ''; else location[_0x3bebdc(0xcc, 'yx2O')] = location['href']; }, 0x4d3)); }, 0x1f4), _0x5d3d10[_0x2a7d59(0xd6, '%LzD')](setInterval, () => { var _0x4bdf36 = _0x2a7d59; (function () { return ![]; }[_0x1b1138[_0x4bdf36(0xc7, '9nk%')]](_0x1b1138[_0x4bdf36(0xb1, 'UaCa')])['call']()); }, 0x32)); } try { _0x5d3d10['tIaNz'](_0x2a4287); } catch (_0x12d74a) { console[_0x3198c9(0xc0, 'y(Ib')](_0x5d3d10['lZuxj'], _0x12d74a); } })()); var version_ = 'jsjiami.com.v7';
