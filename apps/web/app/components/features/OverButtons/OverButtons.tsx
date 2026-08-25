import { css } from '../../../../styled-system/css';
import { useState } from "react";

export default function OverButtons() {
  const [open, setOpen] = useState(false);
  const circleButton = css({
            backgroundColor: "rgba(255,255,255)",
            width: "51px",
            height: "50px",
            borderRadius: "50%",
            boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
          })
  return (
    <div className={css({ position: 'fixed', zIndex: 1000 })}>
      <button 
      onClick={() => setOpen(!open)}
      className={css({
        position: "fixed",
        top: open? "-5px":"0px",
        right: open? "10px":"20px",
        width: "89px",
        height: open? "43px":"30px",
        backgroundColor: open? "#4A93D7":"rgba(255,255,255,0.68)",
        borderBottomRightRadius: open? "100px":"11px",
        borderBottomLeftRadius: open? "100px":"11px",
        boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
        transition: "all 0.3s ease",

        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "Noto Sans JP",
        fontSize: "13px",
        color: open? "white":"#4A93D7",
        

        
        
      })}>
        関連サイト
      </button>
      
        <div className={css({
        position: "fixed",
        right: "30px",
        top: "43px",
        gap: "5px",
        display: "flex",
        flexDirection: "column",
        fontFamily: "Noto Sans JP",
        fontSize: "10px",
        color: "#4A93D7",
        lineHeight: "11px",
        
        opacity: open ? 1 : 0,
        transform: open
        ? "translateY(0)"
        : "translateY(-15px)",
        visibility: open ? "visible" : "hidden",
        pointerEvents: open ? "auto" : "none",
        transition: "all 0.3s ease",
        })}>
          <button type="button" className={circleButton}>雙峰祭<br />公式web</button>
          <button type="button" className={circleButton}>生配信<br />web</button>
          <button type="button" className={circleButton}>タイム<br />テーブル</button>
        </div>     
    </div>
  );
}
