import RenameModal from './RenameModal';
import ShareUserModal from './ShareUserModal'
import DeleteModal from './DeleteModal';
import MoveModal from './MoveModal';
import CopyModal from './CopyModal';
import CreateNewFolder from './CreateNewFolder';
import DeleteForeverModal from "./DeleteForeverModal"
import ConflictModal from './ConflictModal';
import UploadIssuesModal from './UploadIssuesModal';
import ItemInfoModal from "./ItemInfoModal"

const MODAL_COMPONENTS = {
    shareUser: ShareUserModal,
    RenameModal: RenameModal,
    DeleteModal: DeleteModal,
    MoveModal: MoveModal,
    CopyModal: CopyModal,
    createNewFolder: CreateNewFolder,
    DeleteForeverModal: DeleteForeverModal,
    ConflictModal: ConflictModal,
    UploadIssuesModal: UploadIssuesModal,
    ItemInfoModal: ItemInfoModal
};

function ModalManager({ modal, setModal }) {
    if (!modal) return null;

    const ModalComponent = MODAL_COMPONENTS[modal.type];

    if (!ModalComponent) return null;

    return (
        <ModalComponent
            data={modal.data}
            onClose={() => setModal(null)}
        />
    );
}

export default ModalManager;