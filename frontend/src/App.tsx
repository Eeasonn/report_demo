import React from 'react';
import { ConfigProvider, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { XProvider } from '@ant-design/x';
import Layout from './components/Layout';

const App: React.FC = () => {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#1677ff',
          borderRadius: 8,
        },
      }}
    >
      <XProvider>
        <Layout />
      </XProvider>
    </ConfigProvider>
  );
};

export default App;
