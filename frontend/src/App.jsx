
import GlobalContextMenu from './components/features/GlobalContextMenu';
import { UploadProvider } from './context/UploadContext';
import AppRoutes from './components/routes/AppRoutes';
import { DownloadProvider } from './context/DownloadContext';
import DragAndDrop from './components/features/DragAndDrop';
import { SearchProvider } from './context/SearchContext';
import { SocketProvider } from './context/SocketContext';
import { useEffect } from 'react';
import { BellNotificationProvider } from './context/BellNotificationContext';

function App() {

// this is for the our react image drang and drop desabled here
useEffect(() => {
    const disableInternalDrag = (e) => {
        // Prevent all internal items from being dragged
        e.preventDefault();
    };
    window.addEventListener('dragstart', disableInternalDrag);
    return () => {
        window.removeEventListener('dragstart', disableInternalDrag);
    };
}, []);
  return (
    <SearchProvider>
      <UploadProvider>
        <DownloadProvider>
          <SocketProvider>
            <BellNotificationProvider>
              <AppRoutes />
            </BellNotificationProvider>
          </SocketProvider>
        </DownloadProvider>

      </UploadProvider>
    </SearchProvider>
  )
}
export default App