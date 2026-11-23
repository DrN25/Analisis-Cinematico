import React from 'react';

/**
 * Navegación con flechas entre celdas de tabla (data-row / data-col).
 * ArrowUp/ArrowDown siempre cambian de fila; ArrowLeft/ArrowRight cambian de columna
 * cuando el cursor está en el borde del texto actual.
 */
export function handleTableArrowKey(
  e: React.KeyboardEvent<HTMLInputElement>,
  rowIdx: number,
  colIdx: number,
  totalRows: number,
  totalCols: number,
  container: HTMLElement | null,
) {
  if (!container) return;
  const input = e.currentTarget;

  let nextRow = rowIdx;
  let nextCol = colIdx;

  if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (rowIdx <= 0) return;
    nextRow = rowIdx - 1;
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (rowIdx >= totalRows - 1) return;
    nextRow = rowIdx + 1;
  } else if (e.key === 'ArrowLeft') {
    const len = input.value.length;
    const allSelected = input.selectionStart === 0 && input.selectionEnd === len;
    const atStart =
      input.selectionStart === null ||
      allSelected ||
      (input.selectionStart === 0 && input.selectionEnd === 0);
    if (!atStart || colIdx <= 0) return;
    e.preventDefault();
    nextCol = colIdx - 1;
  } else if (e.key === 'ArrowRight') {
    const len = input.value.length;
    const allSelected = input.selectionStart === 0 && input.selectionEnd === len;
    const atEnd =
      input.selectionStart === null ||
      allSelected ||
      (input.selectionStart === len && input.selectionEnd === len);
    if (!atEnd || colIdx >= totalCols - 1) return;
    e.preventDefault();
    nextCol = colIdx + 1;
  } else {
    return;
  }

  const target = container.querySelector<HTMLInputElement>(
    `input[data-row="${nextRow}"][data-col="${nextCol}"]`,
  );
  if (target) {
    target.focus();
    target.select();
  }
}
