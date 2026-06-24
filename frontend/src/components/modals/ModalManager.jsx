// import RenameModal from './RenameModal';
// import ShareUserModal from './ShareUserModal'
// import DeleteModal from './DeleteModal';
// import MoveModal from './MoveModal';
// import CopyModal from './CopyModal';
// import CreateNewFolder from './CreateNewFolder';
// import DeleteForeverModal from "./DeleteForeverModal"
// import ConflictModal from './ConflictModal';
// import UploadIssuesModal from './UploadIssuesModal';
// import ItemInfoModal from "./ItemInfoModal"
// import AddUserAdminModal from './AddUserAdminModal';
// import CropImageModal from './CropImageModal';

// const MODAL_COMPONENTS = {
//     shareUser: ShareUserModal,
//     RenameModal: RenameModal,
//     DeleteModal: DeleteModal,
//     MoveModal: MoveModal,
//     CopyModal: CopyModal,
//     createNewFolder: CreateNewFolder,
//     DeleteForeverModal: DeleteForeverModal,
//     ConflictModal: ConflictModal,
//     UploadIssuesModal: UploadIssuesModal,
//     ItemInfoModal: ItemInfoModal,
//     addUserAdminModal: AddUserAdminModal,
//     cropImageModal: CropImageModal
// };

// function ModalManager({ modal, setModal, modals }) {
//     // 1. Support for the new Modal Stack (Array)
//     if (modals && modals.length > 0) {
//         return (
//             <>
//                 {modals.map((m, index) => {
//                     const ModalComponent = MODAL_COMPONENTS[m.type];
//                     if (!ModalComponent) return null;
                    
//                     const isTop = index === modals.length - 1;

//                     return (
//                         <ModalComponent
//                             key={index}
//                             data={m.data}
//                             // Important: pass setModal down so modals can open other modals!
//                             setModal={setModal}
//                             onClose={() => setModal(null)}
//                             style={{ zIndex: 1050 + index }}
//                             backdrop={isTop ? true : false}
//                         />
//                     );
//                 })}
//             </>
//         );
//     }

//     // 2. Legacy support for single modal (Object)
//     if (modal) {
//         const ModalComponent = MODAL_COMPONENTS[modal.type];
//         if (!ModalComponent) return null;

//         return (
//             <ModalComponent
//                 data={modal.data}
//                 setModal={setModal}
//                 onClose={() => setModal(null)}
//             />
//         );
//     }

//     return null;
// }

// export default ModalManager;










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
import AddUserAdminModal from './AddUserAdminModal';
import CropImageModal from './CropImageModal';
import EditAdminModal from './EditAdminModal';
import ViewAdminModal from './ViewAdminModal';
import AdminDeleteUser from "./AdminDeleteUser"
import EditProfileModal from './EditProfileModal';

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
    ItemInfoModal: ItemInfoModal,
    addUserAdminModal: AddUserAdminModal,
    cropImageModal: CropImageModal,
    editAdminModal: EditAdminModal,
    viewAdminModal: ViewAdminModal,
    adminDeleteUser: AdminDeleteUser,
    editProfileModal: EditProfileModal
};

function ModalManager({ modals, setModal }) {
    if (!modals || modals.length === 0) return null;

    return (
        <>
            {modals.map((m, index) => {
                const ModalComponent = MODAL_COMPONENTS[m.type];
                if (!ModalComponent) return null;

                return (
                    <ModalComponent
                        key={index}
                        data={m.data}
                        setModal={setModal}
                        onClose={() => setModal(null)}
                    />
                );
            })}
        </>
    );
}

export default ModalManager;