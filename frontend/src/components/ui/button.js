import React from "react"

const Button = React.forwardRef(({ 
  className, 
  variant = "default", 
  size = "default", 
  ...props 
}, ref) => {
  let classes = "btn ";
  
  if (variant === "outline") classes += "btn-outline ";
  else classes += "btn-primary ";
  
  if (className) classes += className;
  
  return (
    <button
      className={classes}
      ref={ref}
      {...props}
    />
  )
})
Button.displayName = "Button"

export { Button }