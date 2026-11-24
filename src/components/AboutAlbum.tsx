import { Heart, Sun, X } from "lucide-react";
import Dialog from "./Dialog";

export default function AboutAlbum({ onClose }: { onClose: () => void }) {
  return (
    <Dialog className="about-dialog" onClose={onClose} labelledBy="about-title">
      <div className="about-content">
        <button
          className="icon-button about-close"
          onClick={onClose}
          aria-label="Close album information"
        >
          <X size={21} />
        </button>
        <span className="about-sun">
          <Sun size={37} strokeWidth={1.2} />
        </span>
        <span className="eyebrow">A LITTLE HOME FOR THE GOOD DAYS</span>
        <h2 id="about-title">
          Some things deserve
          <br />
          to be kept <em>close.</em>
        </h2>
        <p>
          A place to wander back to our favorite days. The big adventures, the
          little detours, and everything in between.
        </p>
        <div className="about-note">
          <strong>You’re exploring a sample album.</strong>
          <p>
            These are public sample photos and a demo video, ready to make way
            for our own Bangkok memories.
          </p>
        </div>
        <span className="about-signoff">
          Made with <Heart size={14} /> for our family
        </span>
      </div>
    </Dialog>
  );
}
