import React from 'react';

interface SafeComponentProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  name?: string;
}

const SafeComponent: React.FC<SafeComponentProps> = ({ 
  children, 
  fallback = <div>Loading...</div>,
  name = "Component"
}) => {
  try {
    // Validate that children is a valid React element
    if (children === null || children === undefined) {
      console.warn(`${name}: children is null or undefined`);
      return <>{fallback}</>;
    }

    // Check if children is a plain object (not a React element)
    if (typeof children === 'object' && 
        children !== null && 
        !React.isValidElement(children) &&
        children.constructor === Object) {
      console.error(`${name}: Received plain object as children:`, children);
      return <>{fallback}</>;
    }

    // Check if children is a valid React node
    if (typeof children === 'object' && 'type' in children && typeof children.type === 'undefined') {
      console.warn(`${name}: Invalid component type`);
      return <>{fallback}</>;
    }

    return <>{children}</>;
  } catch (error) {
    console.error(`SafeComponent (${name}) error:`, error);
    return <>{fallback}</>;
  }
};

export default SafeComponent; 