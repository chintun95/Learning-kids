//app/ChildContext.jsx
import React, { createContext, useState, useContext } from 'react';

const ChildContext = createContext();

export const ChildProvider = ({ children }) => {
  const [selectedChild, setSelectedChild] = useState(null);

  return (
    <ChildContext.Provider value={{ selectedChild, setSelectedChild }}>
      {children}
    </ChildContext.Provider>
  );
};

export const useChild = () => useContext(ChildContext);
