"use client"
import React, { useEffect } from 'react'

const Seo = ({ title }:any) => {
  useEffect(() => {
    document.title = `Dharwin ${title}`
  }, [])
  
  return (
    <>
    </>
  )
}

export default Seo;