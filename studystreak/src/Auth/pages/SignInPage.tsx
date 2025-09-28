// LoginPage component - main login page
import Aurora from "@/components/Aurora";
import AuthForm from "../components/AuthForm";


const SignInPage: React.FC = () => {
  return (
    <div className="dark flex min-h-screen relative bg-background rounded-sm overflow-hidden flex-col md:flex-row 
    md:rounded-md md:pd-4">
      {/* Background component */}
      <div className="flex justify-center w-full h-full absolute md:relative
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
      <div className="flex justify-center items-center z-10 w-full md:w-1/2 p-6 min-h-screen">
          {/* Export from AuthForm*/}
          <AuthForm/>
      </div>
    </div>
  );
};

export default SignInPage;
