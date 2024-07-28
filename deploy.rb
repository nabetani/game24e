require 'net/ftp'

HERE = File.split(__FILE__)[0]
DEST_PATH = File.split(File.absolute_path(HERE))[1]

pp DEST_PATH
# exit

def ftp_mkdir_p( ftp, dir )
  begin
    ftp.mkdir( dir )
  rescue Net::FTPPermError
  end
end

def upload( files, to )
  p 1
  Net::FTP.open('nabetani.sakura.ne.jp') do |ftp|
    p 2
    ok = ftp.login('nabetani', File.open(File.expand_path("~/passwords/nabetani.sakura.ne.jp/ftp"), &:read).strip )
    raise "login faile?" unless ok
    ftp.passive = true
    pp ftp.pwd
    ftp.chdir("/home/nabetani/www")
    dest = "#{to}"
    ftp_mkdir_p( ftp, dest )
    pp ftp.pwd
    ftp.chdir(dest)
    p 3
    pp ftp.pwd
    pp ftp.list('*.*')
    files.each do |fn|
      ftp.putbinaryfile(fn)
    end
  end
end


def files( rel )
  Dir.glob( File.join(HERE, rel, "*")).select do |x|
    !File.directory?(x)
  end
end

upload( files("dist"), DEST_PATH)
upload( files("dist/assets"), File.join(DEST_PATH, "assets"))
