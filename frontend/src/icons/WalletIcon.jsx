function WalletIcon({ className = '', ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 -960 960 960"
      fill="currentColor"
      className={className}
      {...props}
    >
      <path d="M200-200v-560 560Zm0 80q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v100h-80v-100H200v560h560v-100h80v100q0 33-23.5 56.5T760-120H200Zm320-160q-33 0-56.5-23.5T440-360v-240q0-33 23.5-56.5T520-680h280q33 0 56.5 23.5T880-600v240q0 33-23.5 56.5T800-280H520Zm280-80v-240H520v240h280Zm-160-60q25 0 42.5-17.5T700-480q0-25-17.5-42.5T640-540q-25 0-42.5 17.5T580-480q0 25 17.5 42.5T640-420Z" />
    </svg>
  );
}

export default WalletIcon;
