import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button'; // 假設使用 shadcn/ui

export function PWAUpdatePrompt() {
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // 定期檢查更新（每小時）
      const interval = setInterval(() => {
        navigator.serviceWorker.ready.then(registration => {
          registration.update();
        });
      }, 60 * 60 * 1000);

      // 監聽更新
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (showUpdatePrompt) {
          window.location.reload();
        }
      });

      // 監聽新版本
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'NEW_VERSION') {
          setShowUpdatePrompt(true);
        }
      });

      return () => clearInterval(interval);
    }
  }, [showUpdatePrompt]);

  if (!showUpdatePrompt) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 p-4 bg-white rounded-lg shadow-lg">
      <p className="mb-2">有新版本可用</p>
      <Button 
        onClick={() => window.location.reload()}
        variant="default"
      >
        立即更新
      </Button>
    </div>
  );
} 