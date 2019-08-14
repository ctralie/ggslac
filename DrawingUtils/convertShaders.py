#Purpose: To create Javascript multiline strings from all of the vertex
#and fragment shaders in this directory and to automatically put those strings
#at the end of Shaders.js.  This eliminates security problems loading external
#files and allows users to execute code on their own computer without cross
#origin problems, while still maintaining some semblance of modularity by 
#allowing the main shader editing to be outside of Javascript and in .C files
import os

STARTLINE = "///*****SHADER STRINGS START*****///\n"
ENDLINE = "///*****SHADER STRINGS END*****///\n"

(OUTPUT_BEGINNING, OUTPUT_SHADERSTRS, OUTPUT_END) = (0, 1, 2)

if __name__ == '__main__':
    files = os.listdir(".")
    files = [f for f in files if (f[-2:] == ".c" or f[-2:] == ".C")]
    fin = open("Shaders.js")
    lines = fin.readlines()
    fin.close()
    fout = open("Shaders.js", "w")
    state = OUTPUT_BEGINNING
    for l in lines:
        if not state == OUTPUT_SHADERSTRS:
            fout.write(l)
        if l == STARTLINE and state == OUTPUT_BEGINNING:
            state = OUTPUT_SHADERSTRS
            #Now open up every shader and convert it into a multiline string
            for f in files:
                shdin = open(f)
                fout.write("var %s = "%f[0:-2])
                linesshd = [lshd.rstrip() for lshd in shdin.readlines()]
                for i in range(len(linesshd)):
                    print linesshd[i]
                    fout.write("\"%s\\n\""%linesshd[i])
                    if i < len(linesshd)-1:
                        fout.write(" + \n")
                fout.write(";\n\n")
                shdin.close()
                
        elif l == ENDLINE and state == OUTPUT_SHADERSTRS:
            state = OUTPUT_END
            fout.write(l)
            
    fout.close()
