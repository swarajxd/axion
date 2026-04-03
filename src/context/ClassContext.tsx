import React, { createContext, useContext, useState } from 'react';

type ClassLevel = '11' | '12';

interface ClassContextValue {
  classLevel: ClassLevel;
  setClassLevel: (c: ClassLevel) => void;
}

const ClassContext = createContext<ClassContextValue>({
  classLevel: '12',
  setClassLevel: () => {},
});

const STORAGE_KEY = 'vstudy_class_level';

export const ClassProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [classLevel, setClassLevelState] = useState<ClassLevel>(() => {
    return (localStorage.getItem(STORAGE_KEY) as ClassLevel) || '12';
  });

  const setClassLevel = (c: ClassLevel) => {
    setClassLevelState(c);
    localStorage.setItem(STORAGE_KEY, c);
  };

  return (
    <ClassContext.Provider value={{ classLevel, setClassLevel }}>
      {children}
    </ClassContext.Provider>
  );
};

export const useClass = () => useContext(ClassContext);