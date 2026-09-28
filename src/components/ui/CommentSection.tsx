'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, MoreVertical, Edit2, Trash2, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';

export interface Comment {
  id: string;
  author: {
    name: string;
    avatar?: string;
    role?: string;
  };
  content: string;
  timestamp: Date;
  edited?: boolean;
}

interface CommentSectionProps {
  comments: Comment[];
  onAddComment: (content: string) => Promise<void>;
  onEditComment?: (id: string, content: string) => Promise<void>;
  onDeleteComment?: (id: string) => Promise<void>;
  currentUser?: {
    name: string;
    avatar?: string;
  };
  placeholder?: string;
  maxLength?: number;
  className?: string;
}

export function CommentSection({
  comments,
  onAddComment,
  onEditComment,
  onDeleteComment,
  currentUser,
  placeholder = 'Add a comment...',
  maxLength = 500,
  className,
}: CommentSectionProps) {
  const [newComment, setNewComment] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [newComment, editContent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onAddComment(newComment.trim());
      setNewComment('');
      toast.success('Comment added', 'Your comment has been posted');
    } catch (error) {
      toast.error('Failed to add comment', 'Please try again');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (id: string) => {
    if (!editContent.trim() || !onEditComment) return;

    try {
      await onEditComment(id, editContent.trim());
      setEditingId(null);
      setEditContent('');
      toast.success('Comment updated', 'Your changes have been saved');
    } catch (error) {
      toast.error('Failed to update comment', 'Please try again');
    }
  };

  const handleDelete = async (id: string) => {
    if (!onDeleteComment) return;

    try {
      await onDeleteComment(id);
      setActiveMenu(null);
      toast.success('Comment deleted', 'The comment has been removed');
    } catch (error) {
      toast.error('Failed to delete comment', 'Please try again');
    }
  };

  const startEdit = (comment: Comment) => {
    setEditingId(comment.id);
    setEditContent(comment.content);
    setActiveMenu(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Comment List */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-full bg-[var(--panel)] flex items-center justify-center mx-auto mb-3">
              <User className="w-6 h-6 text-[var(--text-secondary)]" />
            </div>
            <p className="text-sm text-[var(--text-secondary)]">No comments yet</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">Be the first to comment!</p>
          </div>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className="flex gap-3 p-4 bg-[var(--panel)] border border-[var(--border)] rounded-lg"
            >
              {/* Avatar */}
              <div className="flex-shrink-0">
                {comment.author.avatar ? (
                  <img
                    src={comment.author.avatar}
                    alt={comment.author.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[var(--accent-gold)] flex items-center justify-center text-white text-sm font-semibold">
                    {getInitials(comment.author.name)}
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">
                      {comment.author.name}
                      {comment.author.role && (
                        <span className="ml-2 text-xs font-normal text-[var(--text-secondary)]">
                          {comment.author.role}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)]">
                      {formatTimestamp(comment.timestamp)}
                      {comment.edited && ' (edited)'}
                    </p>
                  </div>

                  {/* Actions Menu */}
                  {(onEditComment || onDeleteComment) && (
                    <div className="relative">
                      <button
                        onClick={() => setActiveMenu(activeMenu === comment.id ? null : comment.id)}
                        className="p-1 rounded hover:bg-[var(--background)] transition-colors"
                      >
                        <MoreVertical className="w-4 h-4 text-[var(--text-secondary)]" />
                      </button>

                      {activeMenu === comment.id && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setActiveMenu(null)}
                          />
                          <div className="absolute right-0 top-full mt-1 z-20 w-32 bg-[var(--panel)] border border-[var(--border)] rounded-lg shadow-lg overflow-hidden">
                            {onEditComment && (
                              <button
                                onClick={() => startEdit(comment)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--background)] transition-colors"
                              >
                                <Edit2 className="w-4 h-4" />
                                Edit
                              </button>
                            )}
                            {onDeleteComment && (
                              <button
                                onClick={() => handleDelete(comment.id)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--error)] hover:bg-[var(--background)] transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Comment Text */}
                {editingId === comment.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      maxLength={maxLength}
                      className="w-full px-3 py-2 text-sm bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] resize-none"
                      rows={3}
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[var(--text-secondary)]">
                        {editContent.length}/{maxLength}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={cancelEdit}
                          className="px-3 py-1.5 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleEdit(comment.id)}
                          disabled={!editContent.trim()}
                          className="px-3 py-1.5 text-sm font-medium text-white bg-[var(--accent-gold)] hover:bg-[#C99B2F] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap break-words">
                    {comment.content}
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* New Comment Form */}
      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={placeholder}
            maxLength={maxLength}
            className="w-full px-4 py-3 pr-12 text-sm bg-[var(--panel)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] resize-none"
            rows={1}
            style={{ minHeight: '44px', maxHeight: '200px' }}
          />
          <button
            type="submit"
            disabled={!newComment.trim() || isSubmitting}
            className={cn(
              'absolute right-2 bottom-2 p-2 rounded-lg transition-all',
              newComment.trim()
                ? 'bg-[var(--accent-gold)] text-white hover:bg-[#C99B2F]'
                : 'bg-[var(--background)] text-[var(--text-secondary)] cursor-not-allowed'
            )}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
          <span>Press Enter to send</span>
          <span>
            {newComment.length}/{maxLength}
          </span>
        </div>
      </form>
    </div>
  );
}
