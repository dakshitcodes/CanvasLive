import { asyncHandler } from '../utils/asyncHandler.js';
import { documentService } from '../services/document.service.js';
import { getAuth } from '../config/firebase.js';
import { ApiError } from '../utils/ApiError.js';

export const listDocuments = asyncHandler(async (req, res) => {
  const { search, limit } = req.query;

  const documents = await documentService.listByUser(
    req.user.uid,
    {
      search,
      limit: limit ? parseInt(limit, 10) : 50,
    },
  );

  res.json({
    success: true,
    data: documents,
    count: documents.length,
  });
});

export const getDocument = asyncHandler(async (req, res) => {
  const doc = await documentService.getById(
    req.params.id,
    req.user.uid,
  );

  res.json({
    success: true,
    data: doc,
  });
});

export const createDocument = asyncHandler(async (req, res) => {
  const doc = await documentService.create(
    req.user.uid,
    req.body,
  );

  res.status(201).json({
    success: true,
    data: doc,
  });
});

export const updateDocument = asyncHandler(async (req, res) => {
  const doc = await documentService.update(
    req.params.id,
    req.user.uid,
    req.body,
  );

  res.json({
    success: true,
    data: doc,
  });
});

export const renameDocument = asyncHandler(async (req, res) => {
  const doc = await documentService.rename(
    req.params.id,
    req.user.uid,
    req.body.title,
  );

  res.json({
    success: true,
    data: doc,
  });
});

export const deleteDocument = asyncHandler(async (req, res) => {
  const result = await documentService.delete(
    req.params.id,
    req.user.uid,
  );

  res.json({
    success: true,
    data: result,
  });
});

export const getVersionHistory = asyncHandler(async (req, res) => {
  const versions = await documentService.getVersions(
    req.params.id,
    req.user.uid,
  );

  res.json({
    success: true,
    data: versions,
  });
});

export const restoreVersion = asyncHandler(async (req, res) => {
  const doc = await documentService.restoreVersion(
    req.params.id,
    req.user.uid,
    req.params.versionId,
  );

  res.json({
    success: true,
    data: doc,
  });
});

export const addCollaborator = asyncHandler(async (req, res) => {
  const { email, role } = req.body;

  const auth = getAuth();

  if (!auth) {
    throw ApiError.internal(
      'Firebase Auth is not configured on server',
    );
  }

  let collaboratorUser;

  try {
    collaboratorUser = await auth.getUserByEmail(
      email.trim().toLowerCase(),
    );
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      throw ApiError.notFound(
        'No registered user found with that email address',
      );
    }

    console.error(
      '[Collaborator] Firebase user lookup failed:',
      error,
    );

    throw ApiError.internal(
      'Failed to find collaborator account',
    );
  }

  if (collaboratorUser.uid === req.user.uid) {
    throw ApiError.badRequest(
      'You cannot add yourself as a collaborator',
    );
  }

  const doc = await documentService.addCollaborator(
    req.params.id,
    req.user.uid,
    {
      userId: collaboratorUser.uid,
      email: collaboratorUser.email || email,
      role,
    },
  );

  res.status(201).json({
    success: true,
    data: doc,
  });
});

export const removeCollaborator = asyncHandler(async (req, res) => {
  const doc = await documentService.removeCollaborator(
    req.params.id,
    req.user.uid,
    req.params.collaboratorId,
  );

  res.json({
    success: true,
    data: doc,
  });
});

export default {
  listDocuments,
  getDocument,
  createDocument,
  updateDocument,
  renameDocument,
  deleteDocument,
  getVersionHistory,
  restoreVersion,
  addCollaborator,
  removeCollaborator,
};