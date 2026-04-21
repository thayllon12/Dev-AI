import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Copy, Users, Globe } from "lucide-react";
import { doc, updateDoc, arrayUnion, arrayRemove, getDocs, collection, query, where, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
import { toast } from "sonner";
import { copyToClipboard } from "../lib/utils";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatId: string;
  ownerId: string;
  isOwner: boolean;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  chatId,
  ownerId,
  isOwner,
}) => {
  const [colabEmail, setColabEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [collaborators, setCollaborators] = useState<{ uid: string; email: string; name: string; photoURL: string; role?: string }[]>([]);
  const [isPublic, setIsPublic] = useState(false);

  const shareUrl = `${window.location.origin}${window.location.pathname}?chatId=${chatId}&ownerId=${ownerId}`;

  React.useEffect(() => {
    if (isOpen && chatId && ownerId) {
      const fetchChatDetails = async () => {
        try {
          const chatRef = doc(db, "users", ownerId, "chats", chatId);
          const chatSnap = await getDoc(chatRef);
          if (chatSnap.exists()) {
            const data = chatSnap.data();
            setIsPublic(!!data.isPublic);
            
            if (data.collaborators && data.collaborators.length > 0) {
              const collabDetails = await Promise.all(
                data.collaborators.map(async (uid: string) => {
                  const userSnap = await getDoc(doc(db, "users", uid));
                  const userData = userSnap.exists() ? userSnap.data() : {};
                  return {
                    uid,
                    email: userData.email || "Email desconhecido",
                    name: userData.displayName || "Usuário",
                    photoURL: userData.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.displayName || "User")}&background=random`,
                    role: data.collaboratorRoles?.[uid] || "edit"
                  };
                })
              );
              setCollaborators(collabDetails);
            } else {
              setCollaborators([]);
            }
          }
        } catch (error) {
          console.error("Error fetching chat details:", error);
        }
      };
      fetchChatDetails();
    }
  }, [isOpen, chatId, ownerId]);

  const handleShareNormal = async () => {
    if (!isOwner) {
      toast.error("Apenas o dono pode alterar as permissões deste chat.");
      return;
    }
    setIsLoading(true);
    try {
      const chatRef = doc(db, "users", ownerId, "chats", chatId);
      await updateDoc(chatRef, { isPublic: true });
      await copyToClipboard(shareUrl);
      toast.success("Chat tornado público! Link copiado.");
    } catch (error) {
      console.error("Error sharing chat:", error);
      toast.error("Erro ao compartilhar chat.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCollaborator = async () => {
    if (!isOwner) {
      toast.error("Apenas o dono pode adicionar colaboradores.");
      return;
    }
    const inputStr = colabEmail.trim();
    if (!inputStr) return;

    setIsLoading(true);
    try {
      let collabUid = "";
      
      // Try exactly by UID first
      const exactDoc = await getDoc(doc(db, "users", inputStr));
      if (exactDoc.exists()) {
        collabUid = exactDoc.id;
      } else {
        // Fallback to searching by Email
        const usersRef = collection(db, "users");
        const searchEmail = inputStr.toLowerCase();
        const q = query(usersRef, where("email", "==", searchEmail));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          toast.error("Usuário não encontrado via ID nem E-mail. Peça para ele acessar e copiar o ID!");
          setIsLoading(false);
          return;
        }
        collabUid = snapshot.docs[0].id;
      }

      const chatRef = doc(db, "users", ownerId, "chats", chatId);
      await updateDoc(chatRef, {
        collaborators: arrayUnion(collabUid),
        [`collaboratorRoles.${collabUid}`]: "edit"
      });
      
      // Create pointer in collaborator's sharedChats
      const chatDoc = await getDoc(chatRef);
      if (chatDoc.exists()) {
        const chatData = chatDoc.data();
        const sharedChatRef = doc(db, "users", collabUid, "sharedChats", chatId);
        await setDoc(sharedChatRef, {
          isShared: true,
          ownerId: ownerId,
          title: chatData.title || "Chat Compartilhado",
          mode: chatData.mode || "Dev AI",
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
      
      await copyToClipboard(shareUrl);
      toast.success("Colaborador adicionado! Link copiado.");
      setColabEmail("");
    } catch (error) {
      console.error("Error adding collaborator:", error);
      toast.error("Erro ao adicionar colaborador.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleMakePrivate = async () => {
    if (!isOwner) return;
    setIsLoading(true);
    try {
      const chatRef = doc(db, "users", ownerId, "chats", chatId);
      await updateDoc(chatRef, { isPublic: false });
      setIsPublic(false);
      toast.success("Chat agora é privado.");
    } catch (error) {
      console.error("Error making chat private:", error);
      toast.error("Erro ao alterar permissão.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateRole = async (collabUid: string, role: string) => {
    if (!isOwner) return;
    setIsLoading(true);
    try {
      const chatRef = doc(db, "users", ownerId, "chats", chatId);
      await updateDoc(chatRef, {
        [`collaboratorRoles.${collabUid}`]: role,
      });
      setCollaborators((prev) =>
        prev.map((c) => (c.uid === collabUid ? { ...c, role } : c))
      );
      toast.success("Permissão atualizada.");
    } catch (error) {
      console.error("Error updating role:", error);
      toast.error("Erro ao atualizar permissão.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveCollaborator = async (collabUid: string) => {
    if (!isOwner) return;
    setIsLoading(true);
    try {
      const chatRef = doc(db, "users", ownerId, "chats", chatId);
      await updateDoc(chatRef, {
        collaborators: arrayRemove(collabUid),
      });
      
      // Remove pointer from collaborator's sharedChats
      const sharedChatRef = doc(db, "users", collabUid, "sharedChats", chatId);
      await deleteDoc(sharedChatRef);
      
      setCollaborators((prev) => prev.filter((c) => c.uid !== collabUid));
      toast.success("Colaborador removido.");
    } catch (error) {
      console.error("Error removing collaborator:", error);
      toast.error("Erro ao remover colaborador.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-bg-surface w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-border-subtle"
          >
            <div className="flex items-center justify-between p-4 border-b border-border-subtle">
              <h2 className="text-lg font-semibold text-text-primary">Compartilhar Chat</h2>
              <button
                onClick={onClose}
                className="p-2 text-text-muted hover:text-text-primary hover:bg-bg-surface-hover rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 space-y-6">
              {/* Normal Share */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-text-primary font-medium">
                    <Globe size={18} className="text-primary" />
                    <span>Compartilhar Link (Público)</span>
                  </div>
                  {isPublic && (
                    <span className="text-xs px-2 py-1 bg-green-500/10 text-green-500 rounded-full font-medium">
                      Público
                    </span>
                  )}
                </div>
                <p className="text-sm text-text-secondary">
                  Qualquer pessoa com o link poderá visualizar este chat.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleShareNormal}
                    disabled={isLoading || !isOwner}
                    className="flex-1 py-2 px-4 bg-bg-surface-hover text-text-primary rounded-lg flex items-center justify-center gap-2 hover:bg-border-subtle transition-colors disabled:opacity-50"
                  >
                    <Copy size={16} />
                    Copiar Link
                  </button>
                  {isPublic && isOwner && (
                    <button
                      onClick={handleMakePrivate}
                      disabled={isLoading}
                      className="py-2 px-4 bg-red-500/10 text-red-500 rounded-lg flex items-center justify-center hover:bg-red-500/20 transition-colors disabled:opacity-50"
                      title="Tornar Privado"
                    >
                      Privar
                    </button>
                  )}
                </div>
              </div>

              <div className="h-px bg-border-subtle w-full" />

              {/* Colab Share */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-text-primary font-medium">
                  <Users size={18} className="text-green-500" />
                  <span>Modo Colab (Edição)</span>
                </div>
                <p className="text-sm text-text-secondary">
                  Adicione colaboradores por Email ou ID (encontrado abaixo de "usuários online") para interagir no chat.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Email ou ID do usuário..."
                    value={colabEmail}
                    onChange={(e) => setColabEmail(e.target.value)}
                    className="flex-1 bg-bg-base text-text-primary text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary border border-border-subtle"
                  />
                  <button
                    onClick={handleAddCollaborator}
                    disabled={isLoading || !colabEmail.trim() || !isOwner}
                    className="py-2 px-4 bg-primary text-white rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    Adicionar
                  </button>
                </div>

                {/* Collaborators List */}
                {collaborators.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <h3 className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                      Colaboradores ({collaborators.length})
                    </h3>
                    <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar pr-2">
                      {collaborators.map((collab) => (
                        <div key={collab.uid} className="flex items-center justify-between p-2 rounded-lg bg-bg-base border border-border-subtle gap-3">
                          <img 
                            src={collab.photoURL} 
                            alt={collab.name} 
                            className="w-8 h-8 rounded-full border border-border-subtle object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-text-primary truncate">{collab.name}</p>
                            <p className="text-xs text-text-muted truncate">{collab.email}</p>
                          </div>
                          {isOwner && (
                            <div className="flex items-center gap-2">
                              <select
                                value={collab.role || "edit"}
                                onChange={(e) => handleUpdateRole(collab.uid, e.target.value)}
                                disabled={isLoading}
                                className="bg-bg-surface border border-border-subtle text-text-secondary text-xs rounded px-2 py-1 focus:outline-none focus:border-primary"
                              >
                                <option value="view">Ouvinte (Ver)</option>
                                <option value="edit">Editor</option>
                                <option value="admin">Sub dono</option>
                              </select>
                              <button
                                onClick={() => handleRemoveCollaborator(collab.uid)}
                                disabled={isLoading}
                                className="p-1 text-text-muted hover:text-red-500 transition-colors shrink-0"
                                title="Remover Colaborador"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {!isOwner && (
                <p className="text-xs text-red-400 text-center mt-2">
                  Apenas o dono do chat pode alterar as configurações de compartilhamento.
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
