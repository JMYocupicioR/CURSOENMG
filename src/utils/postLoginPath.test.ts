import { describe, expect, it } from 'vitest';
import { postLoginPath, postLoginPathFromRoles, shouldRedirectToStaffInbox } from './postLoginPath';

describe('postLoginPath', () => {
  it('sends editors to the teacher dashboard, not /dashboard', () => {
    expect(postLoginPath({ isEditor: true })).toBe('/admin');
    expect(postLoginPathFromRoles(['editor'])).toBe('/admin');
  });

  it('keeps admins on /admin and students on /portal', () => {
    expect(postLoginPath({ isAdmin: true })).toBe('/admin');
    expect(postLoginPathFromRoles(['student'])).toBe('/portal');
  });

  it('honors a same-origin next path', () => {
    expect(postLoginPath({ isEditor: true, next: '/admin/calendario' })).toBe('/admin/calendario');
    expect(postLoginPath({ isEditor: true, next: 'https://evil.example' })).toBe('/admin');
  });

  it('opens the teacher inbox when staff would otherwise land on the student home', () => {
    expect(postLoginPath({ isAdmin: true, next: '/portal' })).toBe('/admin');
    expect(postLoginPath({ isAdmin: true, next: '/portal?tab=assignments' })).toBe('/admin');
    expect(postLoginPath({ isEditor: true, next: '/dashboard' })).toBe('/admin');
    expect(postLoginPath({ isEditor: true, next: '/' })).toBe('/admin');
    expect(postLoginPath({ isAdmin: true, next: '/estudiante' })).toBe('/admin');
    expect(postLoginPath({ next: '/portal' })).toBe('/portal');
  });
});

describe('shouldRedirectToStaffInbox', () => {
  it('sends staff from the student home to the inbox once roles and view are ready', () => {
    expect(shouldRedirectToStaffInbox({
      isStaff: true,
      isLoading: false,
      hydrated: true,
      studentMode: false,
      pathname: '/portal',
    })).toBe(true);
    expect(shouldRedirectToStaffInbox({
      isStaff: true,
      isLoading: false,
      hydrated: true,
      studentMode: false,
      pathname: '/',
    })).toBe(true);
  });

  it('keeps an admin on the root so the teacher landing can render', () => {
    expect(shouldRedirectToStaffInbox({
      isStaff: true,
      isAdmin: true,
      isLoading: false,
      hydrated: true,
      studentMode: false,
      pathname: '/',
    })).toBe(false);
  });

  it('still sends an editor from the root to the inbox', () => {
    expect(shouldRedirectToStaffInbox({
      isStaff: true,
      isAdmin: false,
      isLoading: false,
      hydrated: true,
      studentMode: false,
      pathname: '/',
    })).toBe(true);
  });

  it('keeps an admin who chose student mode on the portal and student homes', () => {
    expect(shouldRedirectToStaffInbox({
      isStaff: true,
      isAdmin: true,
      isLoading: false,
      hydrated: true,
      studentMode: true,
      pathname: '/portal',
    })).toBe(false);
    expect(shouldRedirectToStaffInbox({
      isStaff: true,
      isAdmin: false,
      isLoading: false,
      hydrated: true,
      studentMode: true,
      pathname: '/portal',
    })).toBe(false);
    expect(shouldRedirectToStaffInbox({
      isStaff: true,
      isAdmin: true,
      isLoading: false,
      hydrated: true,
      studentMode: true,
      pathname: '/dashboard',
    })).toBe(false);
    expect(shouldRedirectToStaffInbox({
      isStaff: true,
      isAdmin: true,
      isLoading: false,
      hydrated: true,
      studentMode: true,
      pathname: '/estudiante',
    })).toBe(false);
  });

  it('does not redirect deep links or students', () => {
    expect(shouldRedirectToStaffInbox({
      isStaff: true,
      isLoading: false,
      hydrated: true,
      studentMode: false,
      pathname: '/admin/calendario',
    })).toBe(false);
    expect(shouldRedirectToStaffInbox({
      isStaff: false,
      isLoading: false,
      hydrated: true,
      studentMode: false,
      pathname: '/portal',
    })).toBe(false);
  });
});
