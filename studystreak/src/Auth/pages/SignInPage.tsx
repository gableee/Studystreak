// LoginPage component - main login page
import Aurora from "@/components/Aurora";

const SignInPage: React.FC = () => {
  return (
    <div className="flex min-h-screen relative bg-foreground rounded-sm overflow-hidden flex-col md:flex-row 
    md:rounded-md md:pd-4">
      {/* Background component */}
      <div className="flex justify-center w-full absolute md:relative
      md:w-1/2 md:border-r-4 
      md:border-white 
      md:h-auto 
      md:rounded-r-lg">
        <Aurora
          colorStops={["#55f734", "#e434f7", "#3339f2"]}
          blend={0.5}
          amplitude={1.0}
          speed={0.5}
        />
      </div>

      {/* Login form container */}
      <div className="flex flex-col justify-center items-center p-6 text-white z-10">
        <div>
          <h1 className="text-4xl font-bold mb-4 text-center">Welcome Back</h1>
        </div>
      </div>
    </div>
  );
};

export default SignInPage;
