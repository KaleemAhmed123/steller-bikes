import { Router } from 'express';
import { isValidObjectId } from 'mongoose';
import { NoteModel } from '../models/note.js';
import { noteInputSchema } from '../lib/noteInput.js';
import { requirePermission, type ActorStaff } from '../lib/auth.js';

export const notesRouter = Router();

const staffOf = (res: { locals: Record<string, unknown> }) => res.locals.staff as ActorStaff;

// GET /api/admin/notes?type=&refId= — notes for one entity, a whole type, or all
// (no params). Newest first.
notesRouter.get('/', requirePermission('notes.manage'), async (req, res, next) => {
  try {
    const type = typeof req.query.type === 'string' ? req.query.type : '';
    const refId = typeof req.query.refId === 'string' ? req.query.refId : '';
    const filter: Record<string, unknown> = {};
    if (type) filter.targetType = type;
    if (refId && isValidObjectId(refId)) filter.targetId = refId;
    const notes = await NoteModel.find(filter).sort({ createdAt: -1 }).limit(200).lean();
    res.json({ data: notes });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/notes — create a note (author = the signed-in staff).
notesRouter.post('/', requirePermission('notes.manage'), async (req, res, next) => {
  try {
    const parsed = noteInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: { message: parsed.error.issues[0]?.message ?? 'Check the note.' } });
      return;
    }
    const { type, refId, body } = parsed.data;
    const note = await NoteModel.create({
      author: staffOf(res).email,
      body,
      targetType: type,
      targetId: type === 'general' ? undefined : refId,
    });
    res.status(201).json({ data: note.toObject() });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/notes/:id — author or owner only.
notesRouter.delete('/:id', requirePermission('notes.manage'), async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      res.status(404).json({ error: { message: 'Note not found.' } });
      return;
    }
    const note = await NoteModel.findById(req.params.id);
    if (!note) {
      res.status(404).json({ error: { message: 'Note not found.' } });
      return;
    }
    const staff = staffOf(res);
    if (note.author !== staff.email && staff.role !== 'owner') {
      res.status(403).json({ error: { message: 'You can only delete your own notes.' } });
      return;
    }
    await note.deleteOne();
    res.json({ data: { ok: true } });
  } catch (err) {
    next(err);
  }
});
