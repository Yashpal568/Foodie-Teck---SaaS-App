import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export function CardContainer({
  children,
  className,
  containerClassName
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-center p-2 [perspective:1000px]",
        containerClassName
      )}
    >
      <div
        className={cn(
          "relative transition-all duration-200 ease-linear [transform-style:preserve-3d]",
          className
        )}
      >
        {children}
      </div>
    </div>
  )
}

export function CardBody({
  children,
  className
}) {
  return (
    <div
      className={cn(
        "h-auto w-full [transform-style:preserve-3d] [&>*]:[transform-style:preserve-3d]",
        className
      )}
    >
      {children}
    </div>
  )
}

export function CardItem({
  as: Tag = "div",
  children,
  className,
  translateX = 0,
  translateY = 0,
  translateZ = 0,
  rotateX = 0,
  rotateY = 0,
  rotateZ = 0,
  ...rest
}) {
  return (
    <Tag
      className={cn("w-fit transition duration-200 ease-linear", className)}
      style={{
        transform: `translateX(${translateX}px) translateY(${translateY}px) translateZ(${translateZ}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg)`,
      }}
      {...rest}
    >
      {children}
    </Tag>
  )
}

export default {
  CardContainer,
  CardBody,
  CardItem
}
