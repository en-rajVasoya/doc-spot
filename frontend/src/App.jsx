
import GlobalContextMenu from './components/features/GlobalContextMenu';
import { UploadProvider } from './context/UploadContext';
import AppRoutes from './components/routes/AppRoutes';
import Test from "./components/Test"
import { DownloadProvider } from './context/DownloadContext';
import DragAndDrop from './components/features/DragAndDrop';
import { SearchProvider } from './context/SearchContext';
import { SocketProvider } from './context/SocketContext';

function App() {
  return (
    <SearchProvider>
      <UploadProvider>
        <DownloadProvider>
          <SocketProvider>
            <AppRoutes />
          </SocketProvider>
        </DownloadProvider>

      </UploadProvider>
    </SearchProvider>
  )
}
export default App