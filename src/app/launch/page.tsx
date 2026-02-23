import LaunchWizard from "@/components/LaunchWizard";

export default function LaunchPage() {
  return (
    <div className="py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Launch a Token</h1>
        <p className="text-gray-400">
          Create a CashToken with a bonding curve in three steps
        </p>
      </div>
      <LaunchWizard />
    </div>
  );
}
