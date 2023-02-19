import { ConfigProvider } from 'antd';
import 'antd/dist/antd.less';
import zhCN from 'antd/lib/locale/zh_CN';
import Head from 'next/head';
import './_app.css';

export default function MyApp({ Component, pageProps }) {
  const getLayout = Component.getLayout || ((page) => page);
  const getPageTitle = Component.getPageTitle || (() => '');
  return getLayout(
    <ConfigProvider locale={zhCN}>
      <Head>
        <title>{`${process.env.SYSTEM_NAME}`}</title>
        <link rel="shortcut icon" href="/favicon.png" />
        <meta charSet="UTF-8" />
        <meta
          name="viewport"
          content="width=device-width,minimum-scale=1.0,maximum-scale=1.0,user-scalable=no"
        />
      </Head>
      <Component {...pageProps} />
    </ConfigProvider>,
  );
}
