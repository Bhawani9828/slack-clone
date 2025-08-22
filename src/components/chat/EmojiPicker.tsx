"use client";

import { useMemo } from "react";
import { Popover, Box, IconButton } from "@mui/material";

interface EmojiPickerProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  onSelect: (emoji: string) => void;
  isDark?: boolean;
}

export default function EmojiPicker({ anchorEl, open, onClose, onSelect, isDark = false }: EmojiPickerProps) {
  const emojis = useMemo(
    () => [
      "😀","😁","😂","🤣","😃","😄","😅","🥹","😊","😍","😘","😜","🤩","🤗","🤔","😎","😏","😴","🥱","😪",
      "🙃","🙂","😇","🤤","😋","😛","😝","😤","😭","😡","😢","😮","😱","🤯","🤬","🤒","🤕","🤧","🥵","🥶",
      "👍","👎","👌","✌️","🤞","🤟","🤘","👏","🙌","🙏","💪","🤝","👊","🫶","💖","💘","💝","💗","💓",
      "🔥","✨","🎉","🎊","💯","✔️","🫡","🤝","🫶","🧠","🍀","😇","🥰","🤌","🤤","😆","😉","🫠","🫥","🤫"
    ],
    []
  );

  return (
    <Popover
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      anchorOrigin={{ vertical: "top", horizontal: "left" }}
      transformOrigin={{ vertical: "bottom", horizontal: "left" }}
      slotProps={{ paper: { sx: { p: 1, bgcolor: isDark ? "#1f2937" : "#fff" } } }}
    >
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(8, 32px)",
          gap: 0.5,
          maxWidth: 8 * 32 + 7 * 4,
          p: 0.5,
        }}
      >

            {emojis.map((e) => (
          <IconButton
            key={e}
            onClick={() => {
              onSelect(e);
              onClose();
            }}
            size="small"
            sx={{
              fontSize: 20,
              width: 32,
              height: 32,
              lineHeight: 1,
              borderRadius: 1,
              transition: "transform 0.05s",
              "&:hover": { transform: "scale(1.1)" },
            }}
          >
            {e}
          </IconButton>
        ))}
      </Box>
    </Popover>
  );
}