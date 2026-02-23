import LaunchWizard from "@/components/LaunchWizard";

export default function LaunchPage() {
  return (
    <div className="py-8">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold mb-1 text-text-primary">Launch a Token</h1>
        <p className="text-sm text-text-muted">
          Create a CashToken with automatic bonding curve liquidity
        </p>
      </div>
      <LaunchWizard />
    </div>
  );
}
