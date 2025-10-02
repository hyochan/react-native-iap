import React, {createContext, useContext, useState, useCallback} from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
  StyleSheet,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';

interface DataModalContextType {
  showData: (data: any, title?: string) => void;
  hideModal: () => void;
}

const DataModalContext = createContext<DataModalContextType | undefined>(
  undefined,
);

export function DataModalProvider({children}: {children: React.ReactNode}) {
  const [visible, setVisible] = useState(false);
  const [data, setData] = useState<any>(null);
  const [title, setTitle] = useState('Data Details');

  const showData = useCallback((newData: any, newTitle?: string) => {
    setData(newData);
    setTitle(newTitle || 'Data Details');
    setVisible(true);
  }, []);

  const hideModal = useCallback(() => {
    setVisible(false);
    setTimeout(() => {
      setData(null);
      setTitle('Data Details');
    }, 300);
  }, []);

  const handleCopy = useCallback(() => {
    if (!data) return;

    // Remove sensitive fields
    const {purchaseToken, ...safeData} = data;
    const jsonString = JSON.stringify(safeData, null, 2);

    Clipboard.setString(jsonString);
    Alert.alert('Copied', 'Data copied to clipboard');
  }, [data]);

  return (
    <DataModalContext.Provider value={{showData, hideModal}}>
      {children}

      <Modal
        animationType="slide"
        transparent={true}
        visible={visible}
        onRequestClose={hideModal}
      >
        <View style={styles.overlay}>
          <View style={styles.modalContainer}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>{title}</Text>
              <TouchableOpacity onPress={hideModal}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Content */}
            <ScrollView style={styles.content}>
              <Text style={styles.jsonText}>
                {(() => {
                  if (!data) return '';
                  const {purchaseToken, ...safeData} = data;
                  return JSON.stringify(safeData, null, 2);
                })()}
              </Text>
            </ScrollView>

            {/* Footer */}
            <View style={styles.footer}>
              <TouchableOpacity style={styles.copyButton} onPress={handleCopy}>
                <Text style={styles.buttonText}>📋 Copy JSON</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.closeFooterButton}
                onPress={hideModal}
              >
                <Text style={styles.buttonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </DataModalContext.Provider>
  );
}

export function useDataModal() {
  const context = useContext(DataModalContext);
  if (!context) {
    throw new Error('useDataModal must be used within DataModalProvider');
  }
  return context;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '90%',
    height: '75%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#f8f9fa',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    fontSize: 24,
    color: '#666',
    fontWeight: '300',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  jsonText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 12,
    color: '#333',
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#f8f9fa',
  },
  copyButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  closeFooterButton: {
    flex: 1,
    backgroundColor: '#6c757d',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
