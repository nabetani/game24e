HERE = File.split(__FILE__)[0]
icos=[]
Dir.chdir(HERE) do
  [256,128,64,32,16].each do |s|
    ico = "./icon_#{s}.ico"
    puts %x(magick convert ../favicon.png -resize #{s}x#{s} -unsharp 12x6+0.5+0 #{ico} 2>&1)
    icos.push(ico)
  end
  dest = "../../src/assets/icon.ico"
  puts %x(magick convert #{icos.join(" ")} #{dest} 2>&1)
  puts %x(identify #{dest} 2>&1)
end
