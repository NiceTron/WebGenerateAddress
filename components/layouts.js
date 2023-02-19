import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import { Layout, Menu, Dropdown, Avatar } from 'antd';
import map from 'lodash.map';
import Link from 'next/link';
import { useRouter } from 'next/router';
import React, { useState } from 'react';
import styles from './layouts.module.less';

const { Header, Sider, Content } = Layout;

export default function Layouts({ children }) {
  const [collapsed, setCollapsed] = useState(false);

  const router = useRouter();

  const userMenu = (
    <Menu
      items={[
        {
          key: 'signout',
          label: <Link href="/tool/address">exit</Link>,
        },
      ]}
    />
  );

  const handleMenuClick = (menu) => {
    router.push(menu.key);
  };

  const sideMenuItems = [
    {
      icon: <ToolOutlined />,
      label: '工具',
      key: '/tool',
      children: [
        {
          key: '/tool/address',
          label: '靓号生成',
        },
      ],
    },
  ];

  const defaultOpenKeys = map(sideMenuItems, 'key');

  return (
    <Layout className={styles.app}>

      {/* <Sider trigger={null} collapsible collapsed={collapsed}>
        <Link href="/" className={styles.logo}>
          <img src="/logo.png" />
        </Link>
        <Menu
          theme="dark"
          mode="inline"
          defaultSelectedKeys={[router.pathname]}
          defaultOpenKeys={defaultOpenKeys}
          onClick={handleMenuClick}
          items={sideMenuItems}
        />
      </Sider> */}

      <Layout className={styles.main}>
        {/* <Header className={styles.header} style={{ padding: 0 }}>
          {React.createElement(
            collapsed ? MenuUnfoldOutlined : MenuFoldOutlined,
            {
              className: styles.menu_trigger,
              onClick: () => setCollapsed(!collapsed),
            },
          )}

          <div className={styles.right}>
            <Dropdown overlay={userMenu} placement="bottomLeft" trigger="hover">
              <span className={[styles.action, styles.account]}>
                <Avatar
                  className={styles.avatar}
                  size={18}
                  src="/avatar.png"
                ></Avatar>
                <span>SuperAdmin</span>
              </span>
            </Dropdown>
          </div>
        </Header> */}
        <Content className={styles.content}>{children}</Content>
      </Layout>
    </Layout>
  );
}
