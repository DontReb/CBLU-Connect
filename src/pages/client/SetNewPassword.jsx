import ChangePasswordForm from '../../components/ChangePasswordForm';
import Button from '../../components/ui/Button';
import { useAuth } from '../../lib/authContext';

// Shown instead of the client dashboard after logging in with a temporary
// password from the bank (a new account, or a reset at the branch): the
// client chooses a password only they know before going any further.
export default function SetNewPassword({ onLogout }) {
  const { user, login } = useAuth();

  return (
    <div className="mx-auto max-w-md">
      <h1 className="font-display text-2xl font-medium text-ink md:text-3xl">Choose your own password</h1>
      <p className="mt-1 text-sm text-ink-soft">
        You logged in with a temporary password from the bank. Before you continue, choose a new password
        that only you know.
      </p>
      <div className="mt-5 rounded-2xl border border-line bg-panel p-5 shadow-sm sm:p-6">
        <ChangePasswordForm
          email={user.email}
          currentLabel="Temporary password"
          submitLabel="Save my new password"
          onChanged={(updated) => login(updated)}
        />
      </div>
      <Button type="button" variant="ghost" onClick={onLogout} className="mt-4 px-5 py-2.5">
        Log out
      </Button>
    </div>
  );
}
