import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import { saveUserToFirestore, getUserByUid } from '../services/userService';
import { saveUserToLocalStorage, getUserFromLocalStorage, addAccountToHistory, removeUserFromLocalStorage } from '../utils/userStorage';
import toast from 'react-hot-toast';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Đọc user từ localStorage khi khởi động (để tránh flash của login page)
    const cachedUser = getUserFromLocalStorage();
    if (cachedUser) {
      // Tạo một object tạm thời giống User để set vào state
      // Firebase Auth sẽ sync lại sau
      setCurrentUser(cachedUser as any);
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Lưu thông tin user vào Firestore khi đăng nhập thành công
        try {
          await saveUserToFirestore(user);
          
          // Kiểm tra status của user sau khi lưu
          const currentUserData = await getUserByUid(user.uid);
          if (currentUserData && currentUserData.status !== 'active') {
            // Nếu user chưa được phê duyệt, logout và hiển thị thông báo
            await firebaseSignOut(auth);
            removeUserFromLocalStorage();
            setCurrentUser(null);
            setLoading(false);
            toast.error('Tài khoản của bạn chưa được phê duyệt. Vui lòng chờ quản trị viên phê duyệt.');
            return;
          }
          
          // Chỉ lưu vào localStorage và history nếu status là active
          if (currentUserData?.status === 'active') {
            saveUserToLocalStorage(user);
            addAccountToHistory(user);
          }
        } catch (error) {
          console.error('Failed to save user to Firestore:', error);
          // Không block việc đăng nhập nếu lưu Firestore thất bại
        }
      } else {
        // Xóa khỏi localStorage khi logout
        saveUserToLocalStorage(null);
      }
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const logout = async () => {
    saveUserToLocalStorage(null);
    return firebaseSignOut(auth);
  };

  const value = {
    currentUser,
    loading,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
